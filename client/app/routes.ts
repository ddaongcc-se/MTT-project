import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  route("service-connection", "routes/service-connection.tsx"),
  layout("routes/protected-layout.tsx", [
    layout("routes/layout.tsx", [
      index("routes/dashboard.tsx"),
      route("apps", "routes/apps.tsx"),
      route("processes", "routes/processes.tsx"),
      route("screenshot", "routes/screenshot.tsx"),
      route("keylogger", "routes/keylogger.tsx"),
      route("files", "routes/files.tsx"),
      route("system", "routes/system.tsx"),
      route("webcam", "routes/webcam.tsx"),
    ]),
  ]),
] satisfies RouteConfig;
