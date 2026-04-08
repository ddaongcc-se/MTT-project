import { NavLink, Outlet, useNavigate } from "react-router";
import { Toaster } from "~/components/ui/sonner";
import { TooltipProvider } from "~/components/ui/tooltip";
import { Button } from "~/components/ui/button";
import { useService } from "~/lib/service-context";
import {
  Monitor,
  AppWindow,
  Cpu,
  Camera,
  Keyboard,
  FolderOpen,
  Power,
  Video,
  LogOut,
} from "lucide-react";

const navItems = [
  { to: "/", icon: Monitor, label: "Dashboard" },
  { to: "/apps", icon: AppWindow, label: "Applications" },
  { to: "/processes", icon: Cpu, label: "Processes" },
  { to: "/screenshot", icon: Camera, label: "Screenshot" },
  { to: "/keylogger", icon: Keyboard, label: "Keylogger" },
  { to: "/files", icon: FolderOpen, label: "Files" },
  { to: "/system", icon: Power, label: "System" },
  { to: "/webcam", icon: Video, label: "Webcam" },
];

export default function Layout() {
  const navigate = useNavigate();
  const { clearServiceUrl, serviceUrl } = useService();

  const handleDisconnect = () => {
    clearServiceUrl();
    navigate("/service-connection");
  };

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-background">
        {/* Sidebar */}
        <aside className="w-64 border-r bg-card flex flex-col">
          <div className="p-4 border-b">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Monitor className="h-5 w-5 text-primary" />
              Remote PC Control
            </h1>
          </div>
          <nav className="flex-1 p-2 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="p-4 border-t space-y-3">
            <div className="text-xs text-muted-foreground">
              <div className="truncate">
                <strong>Service:</strong> {serviceUrl || "Not connected"}
              </div>
            </div>
            <Button
              onClick={handleDisconnect}
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2"
            >
              <LogOut className="h-4 w-4" />
              Disconnect
            </Button>
            <div className="text-xs text-muted-foreground">
              Remote PC Control v1.0
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
      <Toaster />
    </TooltipProvider>
  );
}
