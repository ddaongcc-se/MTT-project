package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"remote-pc-control/handlers"
	// "remote-pc-control/middleware"
)

func main() {
	// Check and install ffmpeg if needed (required for webcam recording)
	handlers.EnsureFFmpeg()

	r := chi.NewRouter()

	// Middleware
	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Auth-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Public health check
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok","service":"remote-pc-control"}`))
	})

	// Protected API routes
	r.Group(func(r chi.Router) {
		// r.Use(middleware.AuthMiddleware)

		// System info
		r.Get("/api/system/info", handlers.GetSystemInfo)
		r.Post("/api/system/control", handlers.SystemControl)

		// Applications
		r.Get("/api/apps", handlers.ListApps)
		r.Post("/api/apps/start", handlers.StartApp)
		r.Delete("/api/apps/stop", handlers.StopApp)

		// Processes
		r.Get("/api/processes", handlers.ListProcesses)
		r.Post("/api/processes/start", handlers.StartProcess)
		r.Delete("/api/processes/kill", handlers.KillProcess)

		// Screenshot
		r.Get("/api/screenshot", handlers.TakeScreenshot)
		r.Get("/api/screenshot/image", handlers.StreamScreenshot)

		// Keylogger
		r.Post("/api/keylogger/start", handlers.StartKeylogger)
		r.Post("/api/keylogger/stop", handlers.StopKeylogger)
		r.Get("/api/keylogger/status", handlers.GetKeylogStatus)
		r.Post("/api/keylogger/send", handlers.SendKeys)

		// Files
		r.Get("/api/files", handlers.ListFiles)
		r.Post("/api/files/copy", handlers.CopyFile)
		r.Get("/api/files/download", handlers.DownloadFile)
		r.Post("/api/files/upload", handlers.UploadFile)

		// Webcam
		r.Get("/api/webcam/list", handlers.ListWebcams)
		r.Get("/api/webcam/status", handlers.GetWebcamStatus)
		r.Post("/api/webcam/start", handlers.StartWebcam)
		r.Post("/api/webcam/stop", handlers.StopWebcam)
	})

	// WebSocket (separate auth via query param)
	r.Get("/ws/keylogger", handlers.KeyloggerWS)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	addr := fmt.Sprintf(":%s", port)
	log.Printf("Server starting on %s", addr)
	log.Fatal(http.ListenAndServe(addr, r))
}
