// +build windows

package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os/exec"
	"remote-pc-control/models"
	"strconv"
)

func SystemControl(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var req models.SystemAction
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		json.NewEncoder(w).Encode(models.APIResponse{
			Success: false,
			Message: "invalid request body",
		})
		return
	}

	delay := req.Delay
	if delay < 0 {
		delay = 0
	}

	var cmd *exec.Cmd

	switch req.Action {
	case "shutdown":
		cmd = exec.Command("shutdown", "/s", "/t", strconv.Itoa(delay))
	case "restart":
		cmd = exec.Command("shutdown", "/r", "/t", strconv.Itoa(delay))
	case "logoff":
		cmd = exec.Command("shutdown", "/l")
	case "cancel":
		cmd = exec.Command("shutdown", "/a")
	default:
		json.NewEncoder(w).Encode(models.APIResponse{
			Success: false,
			Message: "invalid action. use: shutdown, restart, logoff, cancel",
		})
		return
	}

	output, err := cmd.CombinedOutput()
	if err != nil {
		json.NewEncoder(w).Encode(models.APIResponse{
			Success: false,
			Message: fmt.Sprintf("failed to execute: %s", string(output)),
		})
		return
	}

	json.NewEncoder(w).Encode(models.APIResponse{
		Success: true,
		Message: fmt.Sprintf("%s command executed (delay: %ds)", req.Action, delay),
	})
}

func GetSystemInfo(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	psCmd := `
$os = Get-CimInstance Win32_OperatingSystem
$cpu = Get-CimInstance Win32_Processor
$disk = Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3"

@{
    hostname = $env:COMPUTERNAME
    os = $os.Caption
    osVersion = $os.Version
    cpu = $cpu.Name
    cpuUsage = (Get-CimInstance Win32_Processor).LoadPercentage
    totalMemory = [math]::Round($os.TotalVisibleMemorySize / 1MB, 2)
    freeMemory = [math]::Round($os.FreePhysicalMemory / 1MB, 2)
    uptime = ((Get-Date) - $os.LastBootUpTime).ToString()
    disks = @($disk | ForEach-Object {
        @{
            drive = $_.DeviceID
            totalGB = [math]::Round($_.Size / 1GB, 2)
            freeGB = [math]::Round($_.FreeSpace / 1GB, 2)
        }
    })
} | ConvertTo-Json -Depth 3
`

	cmd := exec.Command("powershell", "-Command", psCmd)
	output, err := cmd.Output()
	if err != nil {
		json.NewEncoder(w).Encode(models.APIResponse{
			Success: false,
			Message: fmt.Sprintf("failed to get system info: %v", err),
		})
		return
	}

	var sysInfo interface{}
	if err := json.Unmarshal(output, &sysInfo); err != nil {
		json.NewEncoder(w).Encode(models.APIResponse{
			Success: false,
			Message: "failed to parse system info",
		})
		return
	}

	json.NewEncoder(w).Encode(models.APIResponse{
		Success: true,
		Data:    sysInfo,
	})
}
