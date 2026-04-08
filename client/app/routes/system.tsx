import { useState } from "react";
import { api } from "~/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { toast } from "sonner";
import { Power, RotateCcw, LogOut, XCircle } from "lucide-react";

export default function System() {
  const [delay, setDelay] = useState(30);

  const handleAction = async (action: string) => {
    try {
      const res = await api.systemControl(action, action === "logoff" ? 0 : delay);
      if (res.success) {
        toast.success(res.message || `${action} command sent`);
      } else {
        toast.error(res.message || `Failed to ${action}`);
      }
    } catch {
      toast.error(`Failed to execute ${action}`);
    }
  };

  const actions = [
    {
      action: "shutdown",
      label: "Shutdown",
      description: "Shut down the remote PC",
      icon: Power,
      variant: "destructive" as const,
    },
    {
      action: "restart",
      label: "Restart",
      description: "Restart the remote PC",
      icon: RotateCcw,
      variant: "default" as const,
    },
    {
      action: "logoff",
      label: "Log Off",
      description: "Log off the current user",
      icon: LogOut,
      variant: "secondary" as const,
    },
    {
      action: "cancel",
      label: "Cancel Shutdown",
      description: "Cancel a pending shutdown/restart",
      icon: XCircle,
      variant: "outline" as const,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Power className="h-6 w-6" />
          System Control
        </h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Delay (seconds)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Input
              type="number"
              min={0}
              max={3600}
              value={delay}
              onChange={(e) => setDelay(Number(e.target.value))}
              className="w-32"
            />
            <span className="text-sm text-muted-foreground">
              Time before shutdown/restart executes
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {actions.map(({ action, label, description, icon: Icon, variant }) => (
          <Card key={action}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{label}</h3>
                    <p className="text-sm text-muted-foreground">
                      {description}
                    </p>
                  </div>
                </div>
                {action === "cancel" ? (
                  <Button
                    variant={variant}
                    onClick={() => handleAction(action)}
                  >
                    {label}
                  </Button>
                ) : (
                  <AlertDialog>
                    <AlertDialogTrigger
                      render={<Button variant={variant} />}
                    >
                      {label}
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Confirm {label}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to {action} the remote PC
                          {action !== "logoff" && delay > 0
                            ? ` in ${delay} seconds`
                            : " immediately"}
                          ? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleAction(action)}
                        >
                          {label}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
