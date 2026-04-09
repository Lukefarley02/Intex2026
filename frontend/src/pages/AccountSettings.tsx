import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useAuth } from "@/api/AuthContext";
import { useTheme, type ThemeMode } from "@/api/ThemeContext";
import { useRootkit } from "@/api/RootkitContext";
import { Sun, Moon, Monitor, Mail, KeyRound, Trash2, ShieldAlert } from "lucide-react";

// The API base the AuthContext was built against. Duplicated here because
// apiFetch swallows server error messages and we want to surface things like
// "Current password is incorrect." inline on the form.
const API_BASE =
  import.meta.env.VITE_API_URL ??
  "https://ember-api-frbhh6fka2anfnac.francecentral-01.azurewebsites.net";

type Status = { kind: "idle" } | { kind: "success"; message: string } | { kind: "error"; message: string };

async function authFetch(path: string, init: RequestInit): Promise<{ ok: boolean; data: unknown; status: number }> {
  const token = sessionStorage.getItem("jwt");
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers as Record<string, string>),
    },
  });
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  return { ok: res.ok, data, status: res.status };
}

function extractErrorMessage(data: unknown, fallback: string): string {
  if (!data) return fallback;
  if (typeof data === "string") return data;
  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (typeof obj.message === "string") return obj.message;
    // Identity errors come back as { code, description }[]
    if (Array.isArray(obj)) {
      const descs = (obj as Array<Record<string, unknown>>)
        .map((e) => (typeof e.description === "string" ? e.description : null))
        .filter(Boolean);
      if (descs.length) return descs.join(" ");
    }
    const descriptions: string[] = [];
    for (const v of Object.values(obj)) {
      if (typeof v === "string") descriptions.push(v);
      else if (Array.isArray(v)) v.forEach((x) => typeof x === "string" && descriptions.push(x));
    }
    if (descriptions.length) return descriptions.join(" ");
  }
  return fallback;
}

const themeOptions: Array<{ value: ThemeMode; label: string; icon: typeof Sun; hint: string }> = [
  { value: "light", label: "Light", icon: Sun, hint: "Warm ember palette on a cream background." },
  { value: "dark", label: "Dark", icon: Moon, hint: "Low-light friendly with the same Ember accents." },
  { value: "system", label: "Same as system", icon: Monitor, hint: "Follow your operating system preference." },
];

const AccountSettings = () => {
  const {
    user,
    logout,
    mustChangePassword,
    clearMustChangePassword,
    setToken,
    isFounder,
  } = useAuth();
  const { mode, resolved, setMode } = useTheme();
  const { active: rootkitMode, toggle: toggleRootkit } = useRootkit();
  const navigate = useNavigate();

  // --- Email change form ---
  const [newEmail, setNewEmail] = useState(user?.email ?? "");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailStatus, setEmailStatus] = useState<Status>({ kind: "idle" });
  const [emailLoading, setEmailLoading] = useState(false);

  // --- Password change form ---
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwStatus, setPwStatus] = useState<Status>({ kind: "idle" });
  const [pwLoading, setPwLoading] = useState(false);

  // --- Delete account flow ---
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteStatus, setDeleteStatus] = useState<Status>({ kind: "idle" });
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !emailPassword) {
      setEmailStatus({ kind: "error", message: "Both fields are required." });
      return;
    }
    if (newEmail === user?.email) {
      setEmailStatus({ kind: "error", message: "That's already your email address." });
      return;
    }
    setEmailLoading(true);
    setEmailStatus({ kind: "idle" });
    const { ok, data } = await authFetch("/api/auth/change-email", {
      method: "POST",
      body: JSON.stringify({ newEmail, currentPassword: emailPassword }),
    });
    setEmailLoading(false);
    if (!ok) {
      setEmailStatus({ kind: "error", message: extractErrorMessage(data, "Failed to update email.") });
      return;
    }
    // The server returns a fresh JWT keyed to the new email. Swap it in so
    // subsequent calls carry the right identity, then ask the user to log
    // in again so AuthContext picks up the new user record cleanly.
    if (data && typeof data === "object" && "token" in data) {
      sessionStorage.setItem("jwt", (data as { token: string }).token);
    }
    setEmailStatus({ kind: "success", message: "Email updated. Please sign in again with your new email." });
    setEmailPassword("");
    setTimeout(() => {
      logout();
      navigate("/login");
    }, 1500);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPw || !newPw || !confirmPw) {
      setPwStatus({ kind: "error", message: "All fields are required." });
      return;
    }
    if (newPw !== confirmPw) {
      setPwStatus({ kind: "error", message: "New passwords do not match." });
      return;
    }
    // Mirror the hardened password policy: length ≥ 14, upper, lower, digit, symbol.
    const policyOk =
      newPw.length >= 14 &&
      /[A-Z]/.test(newPw) &&
      /[a-z]/.test(newPw) &&
      /[0-9]/.test(newPw) &&
      /[^A-Za-z0-9]/.test(newPw);
    if (!policyOk) {
      setPwStatus({
        kind: "error",
        message: "Password must be at least 14 characters and include uppercase, lowercase, a digit, and a symbol.",
      });
      return;
    }
    setPwLoading(true);
    setPwStatus({ kind: "idle" });
    const { ok, data } = await authFetch("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
    });
    setPwLoading(false);
    if (!ok) {
      setPwStatus({ kind: "error", message: extractErrorMessage(data, "Failed to update password.") });
      return;
    }
    // The backend returns a fresh AuthResponse (with a rotated security
    // stamp) so our current JWT stays valid. Swap it into sessionStorage +
    // AuthContext, clear the forced-reset flag, and if this reset was the
    // mandatory first-login kind, bounce the user into the right dashboard.
    if (data && typeof data === "object" && "token" in data) {
      setToken((data as { token: string }).token);
    }
    const wasForced = mustChangePassword;
    clearMustChangePassword();
    setPwStatus({ kind: "success", message: "Password updated successfully." });
    setCurrentPw("");
    setNewPw("");
    setConfirmPw("");
    if (wasForced) {
      setTimeout(() => {
        const roles = user?.roles ?? [];
        if (roles.includes("Admin") || roles.includes("Staff")) navigate("/dashboard");
        else navigate("/my-impact");
      }, 900);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setDeleteStatus({ kind: "error", message: "Enter your password to confirm." });
      return;
    }
    setDeleteLoading(true);
    setDeleteStatus({ kind: "idle" });
    const { ok, data } = await authFetch("/api/auth/account", {
      method: "DELETE",
      body: JSON.stringify({ currentPassword: deletePassword }),
    });
    setDeleteLoading(false);
    if (!ok) {
      setDeleteStatus({ kind: "error", message: extractErrorMessage(data, "Failed to delete account.") });
      return;
    }
    // Account is gone. Close the dialog, log out, and bounce to the home page.
    setDeleteOpen(false);
    logout();
    navigate("/");
  };

  return (
    <DashboardLayout title="Account Settings">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Forced-reset banner — shown when the user was provisioned with a
            temporary seed password (e.g. new donor created by staff via the
            Log Donation flow). Until they reset, ProtectedRoute pins them
            to this page so the banner is the only thing they can act on. */}
        {mustChangePassword && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 text-amber-900 p-4 flex items-start gap-3 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800">
            <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">Set a new password to continue</p>
              <p className="text-sm">
                Your account was created for you with a temporary password.
                Please choose a permanent password below before using the
                rest of the site. Your temporary password is the "current
                password" for this form.
              </p>
            </div>
          </div>
        )}

        {/* Account overview */}
        <Card>
          <CardHeader>
            <CardTitle>Your account</CardTitle>
            <CardDescription>
              Signed in as <span className="font-medium text-foreground">{user?.email ?? "—"}</span>
              {user?.roles && user.roles.length > 0 && (
                <>
                  {" "}
                  · {user.roles.join(", ")}
                </>
              )}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Theme */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="w-5 h-5" /> Appearance
            </CardTitle>
            <CardDescription>
              Choose light, dark, or match your device. Currently showing{" "}
              <span className="font-medium text-foreground">{resolved}</span> mode.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-3">
              {themeOptions.map((opt) => {
                const Icon = opt.icon;
                const active = mode === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMode(opt.value)}
                    className={`text-left p-4 rounded-lg border transition-colors ${
                      active
                        ? "border-primary bg-primary/10 ring-2 ring-primary"
                        : "border-border hover:border-primary/50 hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-4 h-4" />
                      <span className="font-medium">{opt.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{opt.hint}</p>
                  </button>
                );
              })}
            </div>
            {/* Compact alternative via Select for keyboard users / narrow viewports */}
            <div className="sm:hidden">
              <Label htmlFor="theme-select">Theme</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as ThemeMode)}>
                <SelectTrigger id="theme-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">Same as system</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Change password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5" /> Change password
            </CardTitle>
            <CardDescription>
              Passwords must be at least 14 characters and include upper, lower, digit, and a symbol.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <Label htmlFor="current-pw">Current password</Label>
                <Input
                  id="current-pw"
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <div>
                <Label htmlFor="new-pw">New password</Label>
                <Input
                  id="new-pw"
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <Label htmlFor="confirm-pw">Confirm new password</Label>
                <Input
                  id="confirm-pw"
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              {pwStatus.kind === "error" && (
                <p className="text-sm text-destructive">{pwStatus.message}</p>
              )}
              {pwStatus.kind === "success" && (
                <p className="text-sm text-success">{pwStatus.message}</p>
              )}
              <Button type="submit" disabled={pwLoading}>
                {pwLoading ? "Updating…" : "Update password"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Change email */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" /> Change email
            </CardTitle>
            <CardDescription>
              We'll ask you to confirm your current password. You'll be signed out after the change.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangeEmail} className="space-y-4">
              <div>
                <Label htmlFor="new-email">New email address</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div>
                <Label htmlFor="email-current-pw">Current password</Label>
                <Input
                  id="email-current-pw"
                  type="password"
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              {emailStatus.kind === "error" && (
                <p className="text-sm text-destructive">{emailStatus.message}</p>
              )}
              {emailStatus.kind === "success" && (
                <p className="text-sm text-success">{emailStatus.message}</p>
              )}
              <Button type="submit" disabled={emailLoading}>
                {emailLoading ? "Updating…" : "Update email"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Danger zone */}
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" /> Delete account
            </CardTitle>
            <CardDescription>
              Permanently remove your account. This cannot be undone. Historical donation records are
              preserved for tax and audit purposes but will no longer be linked to a login.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setDeletePassword("");
                setDeleteStatus({ kind: "idle" });
                setDeleteOpen(true);
              }}
            >
              Delete my account
            </Button>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={(v) => {
          setDeleteOpen(v);
          if (!v) {
            setDeletePassword("");
            setDeleteStatus({ kind: "idle" });
          }
        }}
        title="Delete your account?"
        description="This will permanently remove your login. You won't be able to recover it. Enter your current password below to confirm."
        confirmLabel="Yes, delete my account"
        destructive
        loading={deleteLoading}
        onConfirm={handleDeleteAccount}
      >
        <div className="space-y-2 pt-2">
          <Label htmlFor="delete-pw">Current password</Label>
          <Input
            id="delete-pw"
            type="password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            autoComplete="current-password"
          />
          {deleteStatus.kind === "error" && (
            <p className="text-sm text-destructive">{deleteStatus.message}</p>
          )}
        </div>
      </ConfirmDialog>

      {/* 🍺 Rootkit mode — tiny inline toggle at the very bottom, Founder-only.
           User must scroll past all settings to find it. */}
      {isFounder && (
        <div className="flex justify-end mt-16 mb-4">
          <button
            type="button"
            onClick={toggleRootkit}
            className="px-2 py-1 text-[10px] rounded
                       text-transparent hover:text-muted-foreground
                       bg-transparent hover:bg-muted/60
                       transition-all duration-300 cursor-default hover:cursor-pointer"
          >
            {rootkitMode ? "exit rootkit mode" : "swap to rootkit mode"}
          </button>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AccountSettings;
