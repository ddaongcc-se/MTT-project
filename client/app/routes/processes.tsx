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
import { ScrollArea } from "~/components/ui/scroll-area";
import { toast } from "sonner";
import { Cpu, Play, Trash2, RefreshCw, Search } from "lucide-react";

interface Process {
  pid: number;
  name: string;
  cpu: string;
  mem: string;
}

export default function Processes() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [startPath, setStartPath] = useState("");
  const [startArgs, setStartArgs] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchProcesses = async () => {
    setLoading(true);
    try {
      const res = await api.listProcesses();
      if (res.success) {
        setProcesses(res.data as Process[]);
      } else {
        toast.error(res.message || "Failed to list processes");
      }
    } catch {
      toast.error("Cannot connect to server");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProcesses();
  }, []);

  const handleKill = async (pid: number, name: string) => {
    try {
      const res = await api.killProcess(pid);
      if (res.success) {
        toast.success(`Killed ${name} (PID: ${pid})`);
        fetchProcesses();
      } else {
        toast.error(res.message || "Failed to kill process");
      }
    } catch {
      toast.error("Failed to kill process");
    }
  };

  const handleStart = async () => {
    if (!startPath) return;
    const args = startArgs
      ? startArgs.split(" ").filter(Boolean)
      : undefined;
    try {
      const res = await api.startProcess(startPath, args);
      if (res.success) {
        toast.success(res.message || "Process started");
        setStartPath("");
        setStartArgs("");
        setDialogOpen(false);
        setTimeout(fetchProcesses, 1000);
      } else {
        toast.error(res.message || "Failed to start process");
      }
    } catch {
      toast.error("Failed to start process");
    }
  };

  const filtered = processes.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Cpu className="h-6 w-6" />
          Processes
        </h2>
        <div className="flex gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger
              render={<Button />}
            >
              <Play className="h-4 w-4 mr-2" />
              Start Process
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start Process</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Executable path"
                  value={startPath}
                  onChange={(e) => setStartPath(e.target.value)}
                />
                <Input
                  placeholder="Arguments (optional)"
                  value={startArgs}
                  onChange={(e) => setStartArgs(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleStart()}
                />
                <Button onClick={handleStart} className="w-full">
                  Start
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={fetchProcesses} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Processes ({filtered.length})
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search processes..."
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
                  <TableHead>PID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Memory</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((proc) => (
                  <TableRow key={`${proc.pid}-${proc.name}`}>
                    <TableCell className="font-mono">{proc.pid}</TableCell>
                    <TableCell className="font-medium">{proc.name}</TableCell>
                    <TableCell>{proc.mem}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleKill(proc.pid, proc.name)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Kill
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      {loading ? "Loading..." : "No processes found"}
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
