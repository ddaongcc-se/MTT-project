import { useEffect, useState } from "react";
import { api } from "~/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Badge } from "~/components/ui/badge";
import { ScrollArea } from "~/components/ui/scroll-area";
import { toast } from "sonner";
import { AppWindow, Play, Square, RefreshCw, Search } from "lucide-react";

interface Application {
  pid: number;
  name: string;
  windowTitle: string;
  isRunning: boolean;
}

export default function Apps() {
  const [apps, setApps] = useState<Application[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [startPath, setStartPath] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchApps = async () => {
    setLoading(true);
    try {
      const res = await api.listApps();
      if (res.success) {
        setApps(res.data as Application[]);
      } else {
        toast.error(res.message || "Failed to list apps");
      }
    } catch {
      toast.error("Cannot connect to server");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchApps();
  }, []);

  const handleStop = async (pid: number, name: string) => {
    try {
      const res = await api.stopApp(pid);
      if (res.success) {
        toast.success(`Stopped ${name}`);
        fetchApps();
      } else {
        toast.error(res.message || "Failed to stop app");
      }
    } catch {
      toast.error("Failed to stop app");
    }
  };

  const handleStart = async () => {
    if (!startPath) return;
    try {
      const res = await api.startApp(startPath);
      if (res.success) {
        toast.success(`Started: ${startPath}`);
        setStartPath("");
        setDialogOpen(false);
        setTimeout(fetchApps, 1000);
      } else {
        toast.error(res.message || "Failed to start app");
      }
    } catch {
      toast.error("Failed to start app");
    }
  };

  const filtered = apps.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.windowTitle.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <AppWindow className="h-6 w-6" />
          Applications
        </h2>
        <div className="flex gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger
              render={<Button />}
            >
              <Play className="h-4 w-4 mr-2" />
              Start App
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start Application</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="e.g. notepad.exe or C:\Program Files\..."
                  value={startPath}
                  onChange={(e) => setStartPath(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleStart()}
                />
                <Button onClick={handleStart} className="w-full">
                  Launch
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={fetchApps} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Running Applications ({filtered.length})
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search apps..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-280px)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Window Title</TableHead>
                  <TableHead>PID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((app) => (
                  <TableRow key={app.pid}>
                    <TableCell className="font-medium">{app.name}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {app.windowTitle}
                    </TableCell>
                    <TableCell>{app.pid}</TableCell>
                    <TableCell>
                      <Badge variant="default">Running</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleStop(app.pid, app.name)}
                      >
                        <Square className="h-3 w-3 mr-1" />
                        Stop
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      {loading ? "Loading..." : "No applications found"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
