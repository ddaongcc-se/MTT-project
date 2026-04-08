// +build windows

package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"remote-pc-control/models"
	"strings"
)

func ListFiles(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	dirPath := r.URL.Query().Get("path")
	if dirPath == "" {
		dirPath = "C:\\"
	}

	// Sanitize path to prevent directory traversal
	dirPath = filepath.Clean(dirPath)

	entries, err := os.ReadDir(dirPath)
	if err != nil {
		json.NewEncoder(w).Encode(models.APIResponse{
			Success: false,
			Message: fmt.Sprintf("failed to read directory: %v", err),
		})
		return
	}

	var files []models.FileInfo
	for _, entry := range entries {
		info, err := entry.Info()
		if err != nil {
			continue
		}
		files = append(files, models.FileInfo{
			Name:    entry.Name(),
			Path:    filepath.Join(dirPath, entry.Name()),
			Size:    info.Size(),
			IsDir:   entry.IsDir(),
			ModTime: info.ModTime().Format("2006-01-02 15:04:05"),
		})
	}

	json.NewEncoder(w).Encode(models.APIResponse{
		Success: true,
		Data:    files,
	})
}

func CopyFile(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var req models.CopyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		json.NewEncoder(w).Encode(models.APIResponse{
			Success: false,
			Message: "invalid request body",
		})
		return
	}

	if req.Source == "" || req.Destination == "" {
		json.NewEncoder(w).Encode(models.APIResponse{
			Success: false,
			Message: "source and destination are required",
		})
		return
	}

	// Sanitize paths
	req.Source = filepath.Clean(req.Source)
	req.Destination = filepath.Clean(req.Destination)

	src, err := os.Open(req.Source)
	if err != nil {
		json.NewEncoder(w).Encode(models.APIResponse{
			Success: false,
			Message: fmt.Sprintf("failed to open source: %v", err),
		})
		return
	}
	defer src.Close()

	dst, err := os.Create(req.Destination)
	if err != nil {
		json.NewEncoder(w).Encode(models.APIResponse{
			Success: false,
			Message: fmt.Sprintf("failed to create destination: %v", err),
		})
		return
	}
	defer dst.Close()

	written, err := io.Copy(dst, src)
	if err != nil {
		json.NewEncoder(w).Encode(models.APIResponse{
			Success: false,
			Message: fmt.Sprintf("failed to copy file: %v", err),
		})
		return
	}

	json.NewEncoder(w).Encode(models.APIResponse{
		Success: true,
		Message: fmt.Sprintf("copied %d bytes from %s to %s", written, req.Source, req.Destination),
	})
}

func DownloadFile(w http.ResponseWriter, r *http.Request) {
	filePath := r.URL.Query().Get("path")
	if filePath == "" {
		http.Error(w, "path parameter required", http.StatusBadRequest)
		return
	}

	filePath = filepath.Clean(filePath)

	info, err := os.Stat(filePath)
	if err != nil {
		http.Error(w, "file not found", http.StatusNotFound)
		return
	}
	if info.IsDir() {
		http.Error(w, "cannot download directory", http.StatusBadRequest)
		return
	}

	fileName := filepath.Base(filePath)
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", fileName))
	w.Header().Set("Content-Type", "application/octet-stream")
	http.ServeFile(w, r, filePath)
}

func UploadFile(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Limit upload size to 100MB
	r.ParseMultipartForm(100 << 20)

	file, handler, err := r.FormFile("file")
	if err != nil {
		json.NewEncoder(w).Encode(models.APIResponse{
			Success: false,
			Message: fmt.Sprintf("failed to get file: %v", err),
		})
		return
	}
	defer file.Close()

	destDir := r.FormValue("path")
	if destDir == "" {
		destDir = os.TempDir()
	}
	destDir = filepath.Clean(destDir)

	// Sanitize filename
	fileName := filepath.Base(handler.Filename)
	fileName = strings.ReplaceAll(fileName, "..", "")

	destPath := filepath.Join(destDir, fileName)

	dst, err := os.Create(destPath)
	if err != nil {
		json.NewEncoder(w).Encode(models.APIResponse{
			Success: false,
			Message: fmt.Sprintf("failed to create file: %v", err),
		})
		return
	}
	defer dst.Close()

	written, err := io.Copy(dst, file)
	if err != nil {
		json.NewEncoder(w).Encode(models.APIResponse{
			Success: false,
			Message: fmt.Sprintf("failed to save file: %v", err),
		})
		return
	}

	json.NewEncoder(w).Encode(models.APIResponse{
		Success: true,
		Message: fmt.Sprintf("uploaded %s (%d bytes)", fileName, written),
		Data: map[string]string{
			"path": destPath,
		},
	})
}
