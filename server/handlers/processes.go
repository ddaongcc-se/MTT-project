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
)

func ListProcesses(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	cmd := exec.Command("tasklist", "/FO", "CSV", "/NH")
	output, err := cmd.Output()
	if err != nil {
		json.NewEncoder(w).Encode(models.APIResponse{
			Success: false,
			Message: fmt.Sprintf("failed to list processes: %v", err),
		})
		return
	}

	lines := strings.Split(strings.TrimSpace(string(output)), "\n")
	var processes []models.Process

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		fields := parseCSVLine(line)
		if len(fields) < 5 {
			continue
		}

		name := strings.Trim(fields[0], "\"")
		pidStr := strings.Trim(fields[1], "\"")
		memStr := strings.Trim(fields[4], "\"")

		pid, _ := strconv.Atoi(pidStr)

		processes = append(processes, models.Process{
			PID:  pid,
			Name: name,
			Mem:  memStr,
		})
	}

	json.NewEncoder(w).Encode(models.APIResponse{
		Success: true,
		Data:    processes,
	})
}

func KillProcess(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	pidStr := r.URL.Query().Get("pid")
	if pidStr == "" {
		json.NewEncoder(w).Encode(models.APIResponse{
			Success: false,
			Message: "pid parameter is required",
		})
		return
	}

	pid, err := strconv.Atoi(pidStr)
	if err != nil {
		json.NewEncoder(w).Encode(models.APIResponse{
			Success: false,
			Message: "invalid pid",
		})
		return
	}

	cmd := exec.Command("taskkill", "/PID", strconv.Itoa(pid), "/F")
	output, err := cmd.CombinedOutput()
	if err != nil {
		json.NewEncoder(w).Encode(models.APIResponse{
			Success: false,
			Message: fmt.Sprintf("failed to kill process: %s", string(output)),
		})
		return
	}

	json.NewEncoder(w).Encode(models.APIResponse{
		Success: true,
		Message: fmt.Sprintf("process %d killed", pid),
	})
}

func StartProcess(w http.ResponseWriter, r *http.Request) {
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

	cmd := exec.Command(req.Path, req.Args...)
	err := cmd.Start()
	if err != nil {
		json.NewEncoder(w).Encode(models.APIResponse{
			Success: false,
			Message: fmt.Sprintf("failed to start process: %v", err),
		})
		return
	}

	json.NewEncoder(w).Encode(models.APIResponse{
		Success: true,
		Message: fmt.Sprintf("process started with PID %d", cmd.Process.Pid),
		Data:    map[string]int{"pid": cmd.Process.Pid},
	})
}

func parseCSVLine(line string) []string {
	var fields []string
	var current strings.Builder
	inQuotes := false

	for _, ch := range line {
		switch {
		case ch == '"':
			inQuotes = !inQuotes
			current.WriteRune(ch)
		case ch == ',' && !inQuotes:
			fields = append(fields, current.String())
			current.Reset()
		default:
			current.WriteRune(ch)
		}
	}
	fields = append(fields, current.String())
	return fields
}
