import { useState } from "react";
import { useNavigate } from "react-router";
import { useService } from "../lib/service-context";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

const DEFAULT_SERVICES = [
  { name: "Service 1", url: "http://localhost:8080" },
  { name: "Service 2", url: "http://localhost:8081" },
];

export default function ServiceConnection() {
  const navigate = useNavigate();
  const { setServiceUrl } = useService();
  const [customUrl, setCustomUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const testConnection = async (url: string) => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`${url}/health`, {
        method: "GET",
      });

      if (response.ok) {
        setServiceUrl(url);
        navigate("/");
      } else {
        setError("Service returned an error. Please try again.");
      }
    } catch (err) {
      setError("Failed to connect to service. Please check the URL and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (url: string) => {
    await testConnection(url);
  };

  const handleCustomConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) {
      setError("Please enter a service URL");
      return;
    }
    await testConnection(customUrl);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900">
      <Card className="w-full max-w-md border-slate-700">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">Remote PC Control</CardTitle>
          <CardDescription>
            Select a service or enter a custom address to connect
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Preset Services */}
          <div className="space-y-3">
            {DEFAULT_SERVICES.map((service) => (
              <button
                key={service.url}
                onClick={() => handleConnect(service.url)}
                disabled={loading}
                className="w-full px-4 py-3 text-left rounded-lg border border-slate-600 bg-slate-800 hover:bg-slate-700 hover:border-slate-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="font-medium text-white">{service.name}</div>
                <div className="text-sm text-slate-400">{service.url}</div>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-slate-900 text-slate-400">Or custom</span>
            </div>
          </div>

          {/* Custom URL Input */}
          <form onSubmit={handleCustomConnect} className="space-y-3">
            <Input
              type="text"
              placeholder="http://localhost:8080"
              value={customUrl}
              onChange={(e) => {
                setCustomUrl(e.target.value);
                setError("");
              }}
              disabled={loading}
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
            />
            <Button
              type="submit"
              disabled={loading || !customUrl.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {loading ? "Connecting..." : "Connect"}
            </Button>
          </form>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
