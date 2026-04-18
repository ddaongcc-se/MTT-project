// +build windows

package handlers

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"os/exec"
	"strings"
	"remote-pc-control/models"
)

func TakeScreenshot(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Use PowerShell with Win32 API to capture screenshot (works in VM/service sessions)
	psCmd := `
$ErrorActionPreference = 'Stop'
try {
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class DPI {
    [DllImport("user32.dll")]
    public static extern bool SetProcessDPIAware();
}
"@
[DPI]::SetProcessDPIAware() | Out-Null
    Add-Type -AssemblyName System.Drawing
    Add-Type @"
    using System;
    using System.Runtime.InteropServices;
    public class ScreenAPI {
        [DllImport("user32.dll")] public static extern int GetSystemMetrics(int nIndex);
        [DllImport("user32.dll")] public static extern IntPtr GetDesktopWindow();
        [DllImport("user32.dll")] public static extern IntPtr GetWindowDC(IntPtr hWnd);
        [DllImport("user32.dll")] public static extern int ReleaseDC(IntPtr hWnd, IntPtr hDC);
        [DllImport("gdi32.dll")] public static extern bool BitBlt(IntPtr hdcDest, int xDest, int yDest, int wDest, int hDest, IntPtr hdcSrc, int xSrc, int ySrc, int rop);
    }
"@

    $width = [ScreenAPI]::GetSystemMetrics(0)
    $height = [ScreenAPI]::GetSystemMetrics(1)

    if ($width -le 0 -or $height -le 0) {
        $width = 1920
        $height = 1080
    }

    $hDesktop = [ScreenAPI]::GetDesktopWindow()
    $hDC = [ScreenAPI]::GetWindowDC($hDesktop)

    $bitmap = New-Object System.Drawing.Bitmap($width, $height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $hdcDest = $graphics.GetHdc()
    [ScreenAPI]::BitBlt($hdcDest, 0, 0, $width, $height, $hDC, $x, $y, 0x00CC0020) | Out-Null
    $graphics.ReleaseHdc($hdcDest)
    [ScreenAPI]::ReleaseDC($hDesktop, $hDC) | Out-Null

    $ms = New-Object System.IO.MemoryStream
    $bitmap.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $base64 = [Convert]::ToBase64String($ms.ToArray())

    $bitmap.Dispose()
    $graphics.Dispose()
    $ms.Dispose()

    Write-Host $base64
} catch {
    Write-Error $_.Exception.Message
    exit 1
}
`

	cmd := exec.Command("powershell", "-NoProfile", "-NonInteractive", "-Command", psCmd)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	output, err := cmd.Output()
	if err != nil {
		errMsg := strings.TrimSpace(stderr.String())
		json.NewEncoder(w).Encode(models.APIResponse{
			Success: false,
			Message: fmt.Sprintf("failed to take screenshot: %v | stderr: %s", err, errMsg),
		})
		return
	}

	// Trim whitespace/newlines from PowerShell output
	base64Str := strings.TrimSpace(string(output))

	if base64Str == "" {
		errMsg := strings.TrimSpace(stderr.String())
		json.NewEncoder(w).Encode(models.APIResponse{
			Success: false,
			Message: fmt.Sprintf("screenshot returned empty output | stderr: %s", errMsg),
		})
		return
	}

	// Validate it's valid base64
	decoded, err := base64.StdEncoding.DecodeString(base64Str)
	if err != nil || len(decoded) == 0 {
		json.NewEncoder(w).Encode(models.APIResponse{
			Success: false,
			Message: fmt.Sprintf("screenshot capture returned invalid base64: %v", err),
		})
		return
	}

	json.NewEncoder(w).Encode(models.APIResponse{
		Success: true,
		Data: map[string]string{
			"image":  base64Str,
			"format": "png",
		},
	})
}

// StreamScreenshot serves the screenshot as a direct image
func StreamScreenshot(w http.ResponseWriter, r *http.Request) {
	psCmd := `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class ScreenAPI2 {
    [DllImport("user32.dll")] public static extern int GetSystemMetrics(int nIndex);
    [DllImport("user32.dll")] public static extern IntPtr GetDesktopWindow();
    [DllImport("user32.dll")] public static extern IntPtr GetWindowDC(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern int ReleaseDC(IntPtr hWnd, IntPtr hDC);
    [DllImport("gdi32.dll")] public static extern bool BitBlt(IntPtr hdcDest, int xDest, int yDest, int wDest, int hDest, IntPtr hdcSrc, int xSrc, int ySrc, int rop);
}
"@

$width  = [ScreenAPI]::GetSystemMetrics(78) # SM_CXVIRTUALSCREEN
$height = [ScreenAPI]::GetSystemMetrics(79) # SM_CYVIRTUALSCREEN
$x = [ScreenAPI]::GetSystemMetrics(76) # SM_XVIRTUALSCREEN
$y = [ScreenAPI]::GetSystemMetrics(77) # SM_YVIRTUALSCREEN

if ($width -le 0 -or $height -le 0) {
    $width = 1920
    $height = 1080
}

$hDesktop = [ScreenAPI2]::GetDesktopWindow()
$hDC = [ScreenAPI2]::GetWindowDC($hDesktop)

$bitmap = New-Object System.Drawing.Bitmap($width, $height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$hdcDest = $graphics.GetHdc()
[ScreenAPI2]::BitBlt($hdcDest, 0, 0, $width, $height, $hDC, 0, 0, 0x00CC0020) | Out-Null
$graphics.ReleaseHdc($hdcDest)
[ScreenAPI2]::ReleaseDC($hDesktop, $hDC) | Out-Null

$ms = New-Object System.IO.MemoryStream
$bitmap.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
$bytes = $ms.ToArray()

$bitmap.Dispose()
$graphics.Dispose()
$ms.Dispose()

[Console]::OpenStandardOutput().Write($bytes, 0, $bytes.Length)
`

	cmd := exec.Command("powershell", "-NoProfile", "-NonInteractive", "-Command", psCmd)
	output, err := cmd.Output()
	if err != nil {
		http.Error(w, "failed to capture screenshot", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "image/png")
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(output)))
	w.Write(output)
}
