import { useState } from "react";
import { api } from "~/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { toast } from "sonner";
import { Camera, RefreshCw, Download } from "lucide-react";

export default function Screenshot() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const takeScreenshot = async () => {
    setLoading(true);
    try {
      const res = await api.takeScreenshot();
      if (res.success && res.data) {
        setImage(res.data.image);
        toast.success("Screenshot captured");
      } else {
        toast.error(res.message || "Failed to capture screenshot");
      }
    } catch {
      toast.error("Cannot connect to server");
    }
    setLoading(false);
  };

  const downloadScreenshot = () => {
    if (!image) return;
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${image}`;
    link.download = `screenshot-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Camera className="h-6 w-6" />
          Screenshot
        </h2>
        <div className="flex gap-2">
          {image && (
            <Button variant="outline" onClick={downloadScreenshot}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          )}
          <Button onClick={takeScreenshot} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Capture
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Screen Capture</CardTitle>
        </CardHeader>
        <CardContent>
          {image ? (
            <div className="border rounded-lg overflow-hidden">
              <img
                src={`data:image/png;base64,${image}`}
                alt="Screenshot"
                className="w-full h-auto"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Camera className="h-16 w-16 mb-4 opacity-30" />
              <p>Click "Capture" to take a screenshot of the remote PC</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
