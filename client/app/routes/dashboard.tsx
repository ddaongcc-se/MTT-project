import { useEffect, useState } from "react";
import { api } from "~/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Progress } from "~/components/ui/progress";
import {
  Monitor,
  Cpu,
  HardDrive,
  MemoryStick,
  Clock,
  Wifi,
} from "lucide-react";

interface SystemInfo {
  hostname: string;
  os: string;
  osVersion: string;
  cpu: string;
  cpuUsage: number;
  totalMemory: number;
  freeMemory: number;
  uptime: string;
  disks: { drive: string; totalGB: number; freeGB: number }[];
}

export default function Dashboard() {
  const [sysInfo, setSysInfo] = useState<SystemInfo | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");

  const fetchInfo = async () => {
    try {
      const res = await api.getSystemInfo();
      if (res.success) {
        setSysInfo(res.data as SystemInfo);
        setConnected(true);
        setError("");
      } else {
        setError(res.message || "Failed to fetch");
        setConnected(false);
      }
    } catch {
      setError("Cannot connect to server");
      setConnected(false);
    }
  };

  useEffect(() => {
    fetchInfo();
    const interval = setInterval(fetchInfo, 5000);
    return () => clearInterval(interval);
  }, []);

  const memUsed = sysInfo
    ? sysInfo.totalMemory - sysInfo.freeMemory
    : 0;
  const memPercent = sysInfo
    ? Math.round((memUsed / sysInfo.totalMemory) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <Badge variant={connected ? "default" : "destructive"}>
          <Wifi className="h-3 w-3 mr-1" />
          {connected ? "Connected" : "Disconnected"}
        </Badge>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6 text-destructive">{error}</CardContent>
        </Card>
      )}

      {sysInfo && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Hostname</CardTitle>
              <Monitor className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sysInfo.hostname}</div>
              <p className="text-xs text-muted-foreground">{sysInfo.os}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sysInfo.cpuUsage ?? 0}%</div>
              <Progress value={sysInfo.cpuUsage ?? 0} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {sysInfo.cpu}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Memory</CardTitle>
              <MemoryStick className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {memUsed.toFixed(1)} / {sysInfo.totalMemory.toFixed(1)} GB
              </div>
              <Progress value={memPercent} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {memPercent}% used
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Uptime</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">{sysInfo.uptime}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {sysInfo?.disks && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Disk Usage</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sysInfo.disks.map((disk) => {
              const usedGB = disk.totalGB - disk.freeGB;
              const usedPercent = Math.round((usedGB / disk.totalGB) * 100);
              return (
                <Card key={disk.drive}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">
                      {disk.drive}
                    </CardTitle>
                    <HardDrive className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm">
                      {usedGB.toFixed(1)} / {disk.totalGB.toFixed(1)} GB
                    </div>
                    <Progress value={usedPercent} className="mt-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {disk.freeGB.toFixed(1)} GB free
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
