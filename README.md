# Remote PC Control (Ứng dụng điều khiển PC từ xa)

A remote PC control application with a Go server (running on the controlled Windows PC) and a React client (controller dashboard).

## Architecture

- **Server** (Go) — Runs on the Windows PC being controlled. Exposes REST APIs and WebSocket endpoints.
- **Client** (React Router + shadcn/ui) — Dashboard UI for the controller.

## Features

1. **Applications** — List, start, stop running GUI applications
2. **Processes** — List, start, kill system processes
3. **Screenshot** — Capture remote PC screen
4. **Keylogger** — Capture keystrokes and send keys remotely
5. **File Manager** — Browse, copy, upload, download files
6. **System Control** — Shutdown, restart, logoff, cancel shutdown
7. **Webcam** — List devices, start/stop recording

## Setup

### Server (Windows target)

```bash
cd server

# Build for Windows
GOOS=windows GOARCH=amd64 go build -o remote-pc-server.exe .

# Run on the target Windows PC
# Set AUTH_TOKEN env var for security (default: remote-pc-secret)
set AUTH_TOKEN=your-secret-token
remote-pc-server.exe
```

Server starts on port `8080` by default. Set `PORT` env var to change.

### Client

```bash
cd client

# Install dependencies
pnpm install

# Configure server URL
# Edit .env file:
# VITE_API_URL=http://<server-ip>:8080
# VITE_AUTH_TOKEN=your-secret-token

# Development
pnpm dev

# Production build
pnpm build
pnpm start
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/system/info` | System information |
| POST | `/api/system/control` | Shutdown/restart/logoff |
| GET | `/api/apps` | List running applications |
| POST | `/api/apps/start` | Start an application |
| DELETE | `/api/apps/stop?pid=` | Stop an application |
| GET | `/api/processes` | List all processes |
| POST | `/api/processes/start` | Start a process |
| DELETE | `/api/processes/kill?pid=` | Kill a process |
| GET | `/api/screenshot` | Take screenshot (base64) |
| GET | `/api/screenshot/image` | Take screenshot (image) |
| POST | `/api/keylogger/start` | Start keylogger |
| POST | `/api/keylogger/stop` | Stop keylogger |
| GET | `/api/keylogger/status` | Keylogger status |
| POST | `/api/keylogger/send` | Send keystrokes |
| WS | `/ws/keylogger` | Keylogger WebSocket stream |
| GET | `/api/files?path=` | List directory |
| POST | `/api/files/copy` | Copy file |
| GET | `/api/files/download?path=` | Download file |
| POST | `/api/files/upload` | Upload file |
| GET | `/api/webcam/list` | List webcam devices |
| GET | `/api/webcam/status` | Webcam recording status |
| POST | `/api/webcam/start` | Start webcam recording |
| POST | `/api/webcam/stop` | Stop webcam recording |

All API endpoints (except `/health` and `/ws/keylogger`) require `X-Auth-Token` header.
