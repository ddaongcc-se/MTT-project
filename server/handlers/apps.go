// +build windows

package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os/exec"
	"remote-pc-control/models"
	"strings"
)

func ListApps(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// List GUI applications with visible windows using PowerShell
	psCmd := `Get-Process | Where-Object {$_.MainWindowTitle -ne ""} | Select-Object Id, ProcessName, MainWindowTitle | ConvertTo-Json`
	cmd := exec.Command("powershell", "-Command", psCmd)
	output, err := cmd.Output()
	if err != nil {
		json.NewEncoder(w).Encode(models.APIResponse{
			Success: false,
			Message: fmt.Sprintf("failed to list apps: %v", err),
		})
		return
	}

	var apps []struct {
		Id              int    `json:"Id"`
		ProcessName     string `json:"ProcessName"`
		MainWindowTitle string `json:"MainWindowTitle"`
	}

	outStr := strings.TrimSpace(string(output))
	if outStr == "" {
		json.NewEncoder(w).Encode(models.APIResponse{Success: true, Data: []models.Application{}})
		return
	}

	// Handle single object (not array)
	if !strings.HasPrefix(outStr, "[") {
		outStr = "[" + outStr + "]"
	}

	if err := json.Unmarshal([]byte(outStr), &apps); err != nil {
		json.NewEncoder(w).Encode(models.APIResponse{
			Success: false,
			Message: fmt.Sprintf("failed to parse apps: %v", err),
		})
		return
	}

	var result []models.Application
	for _, a := range apps {
		result = append(result, models.Application{
			PID:         a.Id,
			Name:        a.ProcessName,
			WindowTitle: a.MainWindowTitle,
			IsRunning:   true,
		})
	}

	json.NewEncoder(w).Encode(models.APIResponse{
		Success: true,
		Data:    result,
	})
}

func StartApp(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var req models.StartAppRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		json.NewEncoder(w).Encode(models.APIResponse{
			Success: false,
			Message: "invalid request body",
		})
		return
	}

	if req.Path == "" {
		json.NewEncoder(w).Encode(models.APIResponse{
			Success: false,
			Message: "path is required",
		})
		return
	}

	cmd := exec.Command("cmd", "/C", "start", "", req.Path)
	err := cmd.Start()
	if err != nil {
		json.NewEncoder(w).Encode(models.APIResponse{
			Success: false,
			Message: fmt.Sprintf("failed to start app: %v", err),
		})
		return
	}

	json.NewEncoder(w).Encode(models.APIResponse{
		Success: true,
		Message: fmt.Sprintf("app started: %s", req.Path),
	})
}

func StopApp(w http.ResponseWriter, r *http.Request) {
	KillProcess(w, r)
}
