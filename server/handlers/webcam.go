// +build windows

package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os/exec"
	"regexp"
	"remote-pc-control/models"
	"strings"
	"sync"
	"time"
	"io"
)

// EnsureFFmpeg checks if ffmpeg is available and installs it if missing.
// Call this at server startup.
func EnsureFFmpeg() {
	_, err := exec.LookPath("ffmpeg")
	if err == nil {
		log.Println("ffmpeg is already installed")
		return
	}

	log.Println("ffmpeg not found, attempting to install...")

	// Use PowerShell to download and extract ffmpeg
	psCmd := `
$ErrorActionPreference = 'Stop'
$ffmpegDir = 'C:\ffmpeg'
$ffmpegExe = Join-Path $ffmpegDir 'ffmpeg.exe'

if (Test-Path $ffmpegExe) {
    Write-Host "ffmpeg already exists at $ffmpegExe"
    exit 0
}

Write-Host "Downloading ffmpeg..."
$zipPath = Join-Path $env:TEMP 'ffmpeg.zip'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Invoke-WebRequest -Uri 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip' -OutFile $zipPath

Write-Host "Extracting ffmpeg..."
New-Item -ItemType Directory -Path $ffmpegDir -Force | Out-Null
Expand-Archive -Path $zipPath -DestinationPath $env:TEMP\ffmpeg_extract -Force

# Move the bin contents to C:\ffmpeg
$binDir = Get-ChildItem -Path $env:TEMP\ffmpeg_extract -Recurse -Directory -Filter 'bin' | Select-Object -First 1
Copy-Item -Path (Join-Path $binDir.FullName '*') -Destination $ffmpegDir -Force

# Add to system PATH
$currentPath = [Environment]::GetEnvironmentVariable('Path', 'Machine')
if ($currentPath -notlike "*$ffmpegDir*") {
    [Environment]::SetEnvironmentVariable('Path', "$currentPath;$ffmpegDir", 'Machine')
    $env:Path = "$env:Path;$ffmpegDir"
}

# Cleanup
Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
Remove-Item $env:TEMP\ffmpeg_extract -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "ffmpeg installed successfully to $ffmpegDir"
`

	cmd := exec.Command("powershell", "-NoProfile", "-NonInteractive", "-Command", psCmd)
	output, err := cmd.CombinedOutput()
	log.Printf("ffmpeg install output: %s", string(output))
	if err != nil {
		log.Printf("failed to install ffmpeg: %v", err)
		log.Println("please install ffmpeg manually: https://ffmpeg.org/download.html")
		return
	}
	log.Println("ffmpeg installed successfully")
}

var (
	webcamRecording bool
	webcamMu        sync.Mutex
	webcamCmd       *exec.Cmd
	webcamStderr    bytes.Buffer
	webcamStdin io.WriteCloser
	webcamOutputPath   string
	webcamDownloadPath string
)

// listVideoDevices uses ffmpeg to list available DirectShow video devices.
func listVideoDevices() ([]string, error) {
	cmd := exec.Command("ffmpeg", "-list_devices", "true", "-f", "dshow", "-i", "dummy")
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	cmd.Run() // ffmpeg exits with error when listing devices, that's expected

	output := stderr.String()
	var devices []string
	// Parse lines like: [dshow @ ...] "Device Name" (video)
	re := regexp.MustCompile(`"([^"]+)"\s+\(video\)`)
	matches := re.FindAllStringSubmatch(output, -1)
	for _, m := range matches {
		if len(m) > 1 {
			devices = append(devices, m[1])
		}
	}
	return devices, nil
}

func StartWebcam(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	webcamMu.Lock()
	defer webcamMu.Unlock()

	if webcamRecording {
		json.NewEncoder(w).Encode(models.APIResponse{
			Success: false,
			Message: "webcam already recording",
		})
		return
	}

	// Check ffmpeg is available
	ffmpegPath, err := exec.LookPath("ffmpeg")
	if err != nil {
		json.NewEncoder(w).Encode(models.APIResponse{
			Success: false,
			Message: "ffmpeg is not installed or not in PATH",
		})
		return
	}

	// Detect available video devices
	devices, _ := listVideoDevices()
	if len(devices) == 0 {
		json.NewEncoder(w).Encode(models.APIResponse{
			Success: false,
			Message: "no webcam devices found on this system",
		})
		return
	}

	// Use requested device or first available
	deviceName := r.URL.Query().Get("device")
	if deviceName == "" {
		deviceName = devices[0]
	}

	ts := time.Now().Format("20060102_150405")
webcamOutputPath = fmt.Sprintf("C:\\Users\\Public\\webcam_recording_%s.mkv", ts)
webcamDownloadPath = fmt.Sprintf("C:\\Users\\Public\\webcam_recording_%s.mp4", ts)

outputPath := r.URL.Query().Get("output")
if outputPath == "" {
	outputPath = webcamOutputPath
}

	webcamStderr.Reset()
	webcamCmd = exec.Command(ffmpegPath,
		"-f", "dshow",
		"-i", fmt.Sprintf("video=%s", deviceName),
		"-pix_fmt", "yuv420p", // ✅ thêm dòng này
		"-profile:v", "baseline",   // ✅ QUAN TRỌNG
        "-level", "3.0",            // ✅ QUAN TRỌNG
        "-movflags", "+faststart",  // ✅ cho QuickTime
		"-y",
		outputPath,
	)
	webcamCmd.Stderr = &webcamStderr

	// ✅ LẤY stdin SAU KHI TẠO CMD
stdin, err := webcamCmd.StdinPipe()
if err != nil {
	json.NewEncoder(w).Encode(models.APIResponse{
		Success: false,
		Message: fmt.Sprintf("failed to open stdin pipe: %v", err),
	})
	return
}
webcamStdin = stdin

// ✅ RỒI MỚI start
	err = webcamCmd.Start()
	if err != nil {
		json.NewEncoder(w).Encode(models.APIResponse{
			Success: false,
			Message: fmt.Sprintf("failed to start webcam: %v", err),
		})
		return
	}

	// Wait briefly to catch immediate failures (e.g. device not accessible)
	done := make(chan error, 1)
	go func() { done <- webcamCmd.Wait() }()

	select {
	case err := <-done:
		// ffmpeg exited immediately — something went wrong
		errOutput := strings.TrimSpace(webcamStderr.String())
		// Truncate long stderr
		if len(errOutput) > 500 {
			errOutput = errOutput[len(errOutput)-500:]
		}
		webcamCmd = nil
		json.NewEncoder(w).Encode(models.APIResponse{
			Success: false,
			Message: fmt.Sprintf("webcam recording failed to start: %v | %s", err, errOutput),
		})
		return
	case <-time.After(2 * time.Second):
		// Still running after 2s — recording is working
	}

	webcamRecording = true

	json.NewEncoder(w).Encode(models.APIResponse{
		Success: true,
		Message: fmt.Sprintf("webcam recording started (device: %s), saving to: %s", deviceName, outputPath),
	})
}

func StopWebcam(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	webcamMu.Lock()
	defer webcamMu.Unlock()

	if !webcamRecording {
		json.NewEncoder(w).Encode(models.APIResponse{
			Success: false,
			Message: "webcam not recording",
		})
		return
	}

// ✅ stop ffmpeg bằng "q"
	if webcamStdin != nil {
		_, _ = webcamStdin.Write([]byte("q\n"))
		webcamStdin.Close()
		webcamStdin = nil
	}

	// ✅ đợi ffmpeg kết thúc hẳn
	if webcamCmd != nil {
		_ = webcamCmd.Wait()
		webcamCmd = nil
	}


	webcamRecording = false

	if webcamCmd != nil && webcamCmd.Process != nil {
	_ = webcamCmd.Process.Kill()
}

convertCmd := exec.Command("ffmpeg",
	"-i", webcamOutputPath,
	"-c", "copy",
	"-movflags", "+faststart",
	"-y",
	webcamDownloadPath,
)

if err := convertCmd.Run(); err != nil {
	json.NewEncoder(w).Encode(models.APIResponse{
		Success: false,
		Message: fmt.Sprintf("failed to convert recording: %v", err),
	})
	return
}

webcamRecording = false

json.NewEncoder(w).Encode(models.APIResponse{
	Success: true,
	Message: "webcam recording stopped",
	Data: map[string]string{
		"path": webcamDownloadPath,
	},
})
}

func GetWebcamStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	webcamMu.Lock()
	recording := webcamRecording
	webcamMu.Unlock()

	json.NewEncoder(w).Encode(models.APIResponse{
		Success: true,
		Data: map[string]bool{
			"recording": recording,
		},
	})
}

func ListWebcams(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	devices, err := listVideoDevices()
	if err != nil {
		json.NewEncoder(w).Encode(models.APIResponse{
			Success: false,
			Message: fmt.Sprintf("failed to list webcam devices: %v", err),
		})
		return
	}

	json.NewEncoder(w).Encode(models.APIResponse{
		Success: true,
		Data:    devices,
	})
}
