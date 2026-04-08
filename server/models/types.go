package models

type Process struct {
	PID  int    `json:"pid"`
	Name string `json:"name"`
	CPU  string `json:"cpu"`
	Mem  string `json:"mem"`
}

type Application struct {
	Name       string `json:"name"`
	PID        int    `json:"pid"`
	IsRunning  bool   `json:"isRunning"`
	WindowTitle string `json:"windowTitle"`
}

type FileInfo struct {
	Name    string `json:"name"`
	Path    string `json:"path"`
	Size    int64  `json:"size"`
	IsDir   bool   `json:"isDir"`
	ModTime string `json:"modTime"`
}

type CopyRequest struct {
	Source      string `json:"source"`
	Destination string `json:"destination"`
}

type StartAppRequest struct {
	Path string `json:"path"`
	Args []string `json:"args,omitempty"`
}

type KeylogEntry struct {
	Key       string `json:"key"`
	Timestamp int64  `json:"timestamp"`
}

type SystemAction struct {
	Action string `json:"action"` // "shutdown", "restart", "logoff"
	Delay  int    `json:"delay"`  // delay in seconds
}

type APIResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
}
