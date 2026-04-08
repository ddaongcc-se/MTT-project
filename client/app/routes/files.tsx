import { useEffect, useState, useRef } from "react";
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
import {
  FolderOpen,
  File,
  Folder,
  ArrowUp,
  Copy,
  Download,
  Upload,
  RefreshCw,
} from "lucide-react";

interface FileEntry {
  name: string;
  path: string;
  size: number;
  isDir: boolean;
  modTime: string;
}

export default function Files() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [currentPath, setCurrentPath] = useState("C:\\");
  const [pathInput, setPathInput] = useState("C:\\");
  const [loading, setLoading] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copySrc, setCopySrc] = useState("");
  const [copyDst, setCopyDst] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = async (path?: string) => {
    const targetPath = path || currentPath;
    setLoading(true);
    try {
      const res = await api.listFiles(targetPath);
      if (res.success) {
        setFiles(res.data as FileEntry[]);
        setCurrentPath(targetPath);
        setPathInput(targetPath);
      } else {
        toast.error(res.message || "Failed to list files");
      }
    } catch {
      toast.error("Cannot connect to server");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const navigateTo = (path: string) => {
    fetchFiles(path);
  };

  const goUp = () => {
    const parts = currentPath.replace(/\\$/, "").split("\\");
    if (parts.length > 1) {
      parts.pop();
      navigateTo(parts.join("\\") + "\\");
    }
  };

  const handleDownload = (path: string) => {
    const url = api.downloadFileUrl(path);
    window.open(url, "_blank");
  };

  const handleCopy = async () => {
    if (!copySrc || !copyDst) return;
    try {
      const res = await api.copyFile(copySrc, copyDst);
      if (res.success) {
        toast.success(res.message || "File copied");
        setCopyDialogOpen(false);
        setCopySrc("");
        setCopyDst("");
        fetchFiles();
      } else {
        toast.error(res.message || "Failed to copy");
      }
    } catch {
      toast.error("Failed to copy file");
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await api.uploadFile(file, currentPath);
      if (res.success) {
        toast.success(res.message || "File uploaded");
        fetchFiles();
      } else {
        toast.error(res.message || "Failed to upload");
      }
    } catch {
      toast.error("Failed to upload file");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return "-";
    const units = ["B", "KB", "MB", "GB"];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) {
      size /= 1024;
      i++;
    }
    return `${size.toFixed(1)} ${units[i]}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FolderOpen className="h-6 w-6" />
          File Manager
        </h2>
        <div className="flex gap-2">
          <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
            <DialogTrigger
              render={<Button variant="outline" />}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy File
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Copy File</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Source Path</label>
                  <Input
                    placeholder="C:\source\file.txt"
                    value={copySrc}
                    onChange={(e) => setCopySrc(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Destination Path</label>
                  <Input
                    placeholder="C:\dest\file.txt"
                    value={copyDst}
                    onChange={(e) => setCopyDst(e.target.value)}
                  />
                </div>
                <Button onClick={handleCopy} className="w-full">
                  Copy
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleUpload}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goUp}>
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Input
              value={pathInput}
              onChange={(e) => setPathInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && navigateTo(pathInput)}
              className="font-mono"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchFiles()}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-320px)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Modified</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((file) => (
                  <TableRow
                    key={file.path}
                    className={file.isDir ? "cursor-pointer" : ""}
                    onDoubleClick={() => file.isDir && navigateTo(file.path)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {file.isDir ? (
                          <Folder className="h-4 w-4 text-yellow-500" />
                        ) : (
                          <File className="h-4 w-4 text-muted-foreground" />
                        )}
                        {file.isDir ? (
                          <button
                            className="hover:underline text-left"
                            onClick={() => navigateTo(file.path)}
                          >
                            {file.name}
                          </button>
                        ) : (
                          file.name
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{file.isDir ? "-" : formatSize(file.size)}</TableCell>
                    <TableCell className="text-sm">{file.modTime}</TableCell>
                    <TableCell className="text-right">
                      {!file.isDir && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(file.path)}
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {files.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      {loading ? "Loading..." : "Empty directory"}
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
