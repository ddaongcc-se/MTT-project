import { useEffect, useState } from "react";
import { api } from "~/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { toast } from "sonner";
import { Video, Play, Square, RefreshCw } from "lucide-react";

interface WebcamDevice {
  Name: string;
  DeviceID: string;
}

export default function Webcam() {
  const [recording, setRecording] = useState(false);
  const [devices, setDevices] = useState<WebcamDevice[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStatus();
    fetchDevices();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await api.getWebcamStatus();
      if (res.success && res.data) {
        setRecording((res.data as { recording: boolean }).recording);
      }
    } catch {
      // ignore
    }
  };

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const res = await api.listWebcams();
      if (res.success && res.data) {
        const data = res.data;
        setDevices(Array.isArray(data) ? data : [data] as WebcamDevice[]);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  };

  const startRecording = async () => {
    try {
      const res = await api.startWebcam();
      if (res.success) {
        setRecording(true);
        toast.success(res.message || "Recording started");
      } else {
        toast.error(res.message || "Failed to start");
      }
    } catch {
      toast.error("Failed to start webcam");
    }
  };

  const stopRecording = async () => {
    try {
      const res = await api.stopWebcam();
      if (res.success) {
        setRecording(false);
        toast.success("Recording stopped");
      } else {
        toast.error(res.message || "Failed to stop");
      }
    } catch {
      toast.error("Failed to stop webcam");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Video className="h-6 w-6" />
          Webcam
        </h2>
        <div className="flex items-center gap-2">
          <Badge variant={recording ? "default" : "secondary"}>
            {recording ? "Recording" : "Idle"}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recording Control</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center py-8 gap-4">
              <div
                className={`p-6 rounded-full ${
                  recording
                    ? "bg-red-100 dark:bg-red-900/30"
                    : "bg-accent"
                }`}
              >
                <Video
                  className={`h-12 w-12 ${
                    recording ? "text-red-500 animate-pulse" : "text-muted-foreground"
                  }`}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {recording
                  ? "Webcam is recording..."
                  : "Click start to begin recording"}
              </p>
              {recording ? (
                <Button variant="destructive" onClick={stopRecording} size="lg">
                  <Square className="h-4 w-4 mr-2" />
                  Stop Recording
                </Button>
              ) : (
                <Button onClick={startRecording} size="lg">
                  <Play className="h-4 w-4 mr-2" />
                  Start Recording
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Available Devices</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchDevices}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {devices.length > 0 ? (
              <div className="space-y-3">
                {devices.map((device, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-lg border"
                  >
                    <Video className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{device.Name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-xs">
                        {device.DeviceID}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-8 text-muted-foreground">
                <Video className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm">No webcam devices found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
