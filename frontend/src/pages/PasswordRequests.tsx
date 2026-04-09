import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { KeyRound, CheckCircle, Copy, Clock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/api/client";
import { toast } from "@/hooks/use-toast";

interface ResetRequest {
  requestId: number;
  email: string;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
  resolvedByEmail: string | null;
}

interface ResolveResponse {
  requestId: number;
  email: string;
  tempPassword: string;
}

const fmtDate = (d: string) =>
  new Date(d + (d.endsWith("Z") ? "" : "Z")).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const PasswordRequests = () => {
  const qc = useQueryClient();
  const [resolvedResult, setResolvedResult] = useState<ResolveResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: requests, isLoading } = useQuery<ResetRequest[]>({
    queryKey: ["password-reset-requests"],
    queryFn: () => apiFetch<ResetRequest[]>("/api/password-reset/requests"),
    refetchInterval: 30_000, // auto-refresh every 30s
  });

  const resolveMut = useMutation({
    mutationFn: (id: number) =>
      apiFetch<ResolveResponse>(`/api/password-reset/requests/${id}/resolve`, {
        method: "POST",
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["password-reset-requests"] });
      setResolvedResult(data);
    },
    onError: (e: Error) => {
      toast({ title: "Failed to resolve", description: e.message, variant: "destructive" });
    },
  });

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copy failed", description: "Please copy the password manually.", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout title="Password Reset Requests">
      <div className="max-w-4xl space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <KeyRound className="w-6 h-6 text-primary" /> Password Reset Requests
          </h2>
          <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
            When a user clicks "Forgot password?" on the login page, a request appears here.
            Click <strong>Resolve</strong> to generate a temporary password and reset their
            account — they'll be required to set a new password on next login.
          </p>
        </div>

        {/* Request list */}
        {isLoading && (
          <p className="text-muted-foreground text-sm">Loading requests…</p>
        )}

        {!isLoading && (requests?.length ?? 0) === 0 && (
          <Card>
            <CardContent className="p-10 text-center">
              <CheckCircle className="w-10 h-10 text-success mx-auto mb-3 opacity-60" />
              <p className="font-semibold text-foreground">No pending requests</p>
              <p className="text-sm text-muted-foreground mt-1">
                All password reset requests have been handled.
              </p>
            </CardContent>
          </Card>
        )}

        {(requests ?? []).map((r) => (
          <Card key={r.requestId}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center flex-shrink-0">
                <KeyRound className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{r.email}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" />
                  Requested {fmtDate(r.createdAt)}
                </p>
              </div>
              <Badge
                className={
                  r.status === "Pending"
                    ? "bg-warning/10 text-warning border-warning/20"
                    : "bg-success/10 text-success border-success/20"
                }
              >
                {r.status}
              </Badge>
              {r.status === "Pending" && (
                <Button
                  size="sm"
                  variant="hero"
                  onClick={() => resolveMut.mutate(r.requestId)}
                  disabled={resolveMut.isPending}
                >
                  {resolveMut.isPending ? "Resetting…" : "Resolve"}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Temp password reveal dialog ── */}
      <Dialog
        open={resolvedResult !== null}
        onOpenChange={(o) => {
          if (!o) setResolvedResult(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-success" />
              Password reset successfully
            </DialogTitle>
            <DialogDescription>
              A temporary password has been generated for{" "}
              <strong>{resolvedResult?.email}</strong>. Share it with the user
              — they will be required to set a new password on their next login.
              This password is shown only once.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-muted rounded-lg p-4 flex items-center gap-3 my-2">
            <code className="flex-1 font-mono text-base tracking-wider break-all">
              {resolvedResult?.tempPassword}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                resolvedResult?.tempPassword && copyToClipboard(resolvedResult.tempPassword)
              }
            >
              {copied ? <CheckCircle className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            This value is not stored. Once you close this dialog it cannot be retrieved.
          </p>

          <DialogFooter>
            <Button variant="hero" onClick={() => setResolvedResult(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default PasswordRequests;
