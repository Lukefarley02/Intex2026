import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  TrendingUp,
  UserPlus,
  Settings,
  Eye,
  EyeOff,
  MapPin,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/api/client";

// ---- Types ----
interface AdminUserRow {
  id: string;
  email: string | null;
  emailConfirmed: boolean;
  lockedOut: boolean;
  roles: string[];
  region: string | null;
  city: string | null;
  adminScope: string | null;
}

interface DashboardStats {
  activeDonors: number;
  donorsThisMonth: number;
  donationsYtd: number;
  donationsYtdChangePct: number;
  donationsThisMonth: number;
  donationsMonthChangePct: number;
  donorRetention: number; // 0..1
  recentActivity: Array<{
    donationId: number;
    supporterName: string | null;
    amount: number | null;
    donationDate: string | null;
    campaignName: string | null;
  }>;
}

interface SafehouseRow {
  safehouseId: number;
  capacityGirls: number | null;
  activeResidents: number;
  storedOccupancy: number | null;
}

interface ResidentRow {
  residentId: number;
  caseStatus: string | null;
}

const roleColor: Record<string, string> = {
  Admin: "bg-primary/10 text-primary border-primary/20",
  Manager: "bg-secondary/10 text-secondary border-secondary/20",
  Staff: "bg-gold/10 text-gold border-gold/20",
  Donor: "bg-success/10 text-success border-success/20",
};

const initials = (email: string | null) => {
  if (!email) return "?";
  const name = email.split("@")[0];
  const parts = name.split(/[._-]/).filter(Boolean);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
};

// ── Empty form shapes ───────────────────────────────────────────────
// Add-user form: only collects the identity bits the create endpoint
// accepts. Region/City are set later via the Edit dialog because the
// create endpoint uses POST /api/adminusers while scope uses
// PUT /api/adminusers/{id}/scope.
const EMPTY_FORM = { email: "", password: "", confirm: "", role: "Donor" };

// Edit form covers everything the Edit dialog can change: identity,
// role, optional password reset, AND region/city scope. The Save
// button dispatches two mutations — editMutation for email/role/password
// and scopeMutation for region/city — in sequence so both succeed or
// the dialog stays open showing the error.
const EMPTY_EDIT = {
  id: "",
  email: "",
  role: "Donor",
  newPassword: "",
  confirmPassword: "",
  region: "",
  city: "",
};

const Admin = () => {
  const queryClient = useQueryClient();

  // ── Add-user dialog state ─────────────────────────────────────────
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  // ── Edit-user dialog state ────────────────────────────────────────
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(EMPTY_EDIT);
  const [editError, setEditError] = useState<string | null>(null);
  const [showEditPassword, setShowEditPassword] = useState(false);

  // ── Create user mutation ──────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: typeof EMPTY_FORM) =>
      apiFetch("/api/adminusers", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminusers"] });
      setAddOpen(false);
      setForm(EMPTY_FORM);
      setFormError(null);
    },
    onError: (err: unknown) => {
      setFormError(err instanceof Error ? err.message : "Failed to create user.");
    },
  });

  // ── Edit-user mutation (email / role / optional password) ─────────
  const editMutation = useMutation({
    mutationFn: (data: typeof EMPTY_EDIT) =>
      apiFetch(`/api/adminusers/${data.id}`, {
        method: "PUT",
        body: JSON.stringify({
          email: data.email,
          role: data.role,
          newPassword: data.newPassword || null,
        }),
      }),
    onError: (err: unknown) => {
      setEditError(err instanceof Error ? err.message : "Failed to update user.");
    },
  });

  // ── Scope (region + city) mutation ────────────────────────────────
  // Backend: PUT /api/adminusers/{id}/scope — Founder-only. This is
  // the endpoint that lets a company-level admin fix a staff account
  // whose City doesn't match any safehouse row (e.g. a staff user
  // seeded with "west / Salem" when the safehouse is "Visayas / Cebu
  // City"). Leaving both fields blank promotes an Admin to Founder.
  const scopeMutation = useMutation({
    mutationFn: (data: { id: string; region: string; city: string }) =>
      apiFetch<{ message: string; region: string | null; city: string | null }>(
        `/api/adminusers/${data.id}/scope`,
        {
          method: "PUT",
          body: JSON.stringify({
            region: data.region.trim() || null,
            city: data.city.trim() || null,
          }),
        },
      ),
    onError: (err: unknown) => {
      setEditError(err instanceof Error ? err.message : "Failed to update scope.");
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────
  const handleCreate = () => {
    if (form.password !== form.confirm) {
      setFormError("Passwords do not match.");
      return;
    }
    setFormError(null);
    createMutation.mutate(form);
  };

  // Dispatches both editMutation and scopeMutation in sequence and
  // only closes the dialog when both succeed. If either fails, the
  // error is shown in the dialog and the user can retry.
  const handleSaveEdit = async () => {
    setEditError(null);
    try {
      await editMutation.mutateAsync(editForm);
      await scopeMutation.mutateAsync({
        id: editForm.id,
        region: editForm.region,
        city: editForm.city,
      });
      queryClient.invalidateQueries({ queryKey: ["adminusers"] });
      setEditOpen(false);
      setEditForm(EMPTY_EDIT);
      setEditError(null);
    } catch {
      // onError handlers above already set editError — keep the
      // dialog open so the user can fix and retry.
    }
  };

  const openEditDialog = (u: AdminUserRow) => {
    setEditForm({
      id: u.id,
      email: u.email ?? "",
      role: u.roles[0] ?? "Donor",
      newPassword: "",
      confirmPassword: "",
      region: u.region ?? "",
      city: u.city ?? "",
    });
    setEditError(null);
    setShowEditPassword(false);
    setEditOpen(true);
  };

  // ── Queries ───────────────────────────────────────────────────────
  const usersQuery = useQuery<AdminUserRow[]>({
    queryKey: ["adminusers"],
    queryFn: () => apiFetch<AdminUserRow[]>("/api/adminusers"),
  });

  const statsQuery = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: () => apiFetch<DashboardStats>("/api/dashboard/stats"),
  });

  const safehousesQuery = useQuery<SafehouseRow[]>({
    queryKey: ["safehouses"],
    queryFn: () => apiFetch<SafehouseRow[]>("/api/safehouses"),
  });

  const residentsQuery = useQuery<ResidentRow[]>({
    queryKey: ["residents"],
    queryFn: () => apiFetch<ResidentRow[]>("/api/residents"),
  });

  const users = usersQuery.data ?? [];

  // ---- KPI derivations ----
  const donorRetention = Math.round((statsQuery.data?.donorRetention ?? 0) * 100);

  const safehouses = safehousesQuery.data ?? [];
  const totalCapacity = safehouses.reduce(
    (acc, sh) => acc + (sh.capacityGirls ?? 0),
    0,
  );
  const totalResidents = safehouses.reduce(
    (acc, sh) => acc + (sh.activeResidents ?? sh.storedOccupancy ?? 0),
    0,
  );
  const safehouseUtilization =
    totalCapacity > 0 ? Math.round((totalResidents / totalCapacity) * 100) : 0;

  const residents = residentsQuery.data ?? [];
  const completedCount = residents.filter((r) => {
    const s = (r.caseStatus ?? "").toLowerCase();
    return (
      s.includes("closed") ||
      s.includes("reintegrated") ||
      s.includes("exited") ||
      s.includes("follow")
    );
  }).length;
  const programCompletion =
    residents.length > 0
      ? Math.round((completedCount / residents.length) * 100)
      : 0;

  const kpis = [
    { label: "Donor retention rate", value: donorRetention, suffix: "%" },
    { label: "Safehouse utilization", value: safehouseUtilization, suffix: "%" },
    { label: "Program completion rate", value: programCompletion, suffix: "%" },
  ];

  const savingEdit = editMutation.isPending || scopeMutation.isPending;

  return (
    <DashboardLayout title="Admin Panel">
      {/* KPIs */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {kpis.map((k) => (
          <Card key={k.label} className="rounded-xl shadow-sm">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{k.label}</span>
                <TrendingUp className="w-4 h-4 text-success" />
              </div>
              <div className="text-3xl font-bold">
                {k.value}
                {k.suffix}
              </div>
              <Progress value={k.value} className="h-2" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* User management */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4" /> User management
          </CardTitle>
          <Button
            variant="hero"
            size="sm"
            onClick={() => {
              setForm(EMPTY_FORM);
              setFormError(null);
              setAddOpen(true);
            }}
          >
            <UserPlus className="w-4 h-4 mr-1" /> Add user
          </Button>
        </CardHeader>
        <CardContent>
          {usersQuery.isLoading && (
            <p className="text-sm text-muted-foreground">Loading users…</p>
          )}
          {usersQuery.isError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              Could not load users from the server.
            </div>
          )}
          {!usersQuery.isLoading && !usersQuery.isError && users.length === 0 && (
            <p className="text-sm text-muted-foreground">No users found.</p>
          )}

          <div className="space-y-2">
            {users.map((u) => {
              const primaryRole = u.roles[0] ?? "User";
              const status = u.lockedOut
                ? "Locked"
                : u.emailConfirmed
                  ? "Active"
                  : "Pending";
              return (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold uppercase">
                      {initials(u.email)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {u.email ?? "(no email)"}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                        <span>
                          {u.roles.length > 0
                            ? u.roles.join(", ")
                            : "No roles assigned"}
                        </span>
                        <span className="text-muted-foreground/60">·</span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {u.region || "—"}
                          {u.city ? ` / ${u.city}` : ""}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={roleColor[primaryRole] ?? ""}
                    >
                      {primaryRole}
                    </Badge>
                    <Badge
                      variant={status === "Active" ? "outline" : "secondary"}
                      className={
                        status === "Active"
                          ? "bg-success/10 text-success border-success/20"
                          : status === "Locked"
                            ? "bg-destructive/10 text-destructive border-destructive/20"
                            : ""
                      }
                    >
                      {status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(u)}
                      title="Edit user"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Edit user dialog ─────────────────────────────────────────
          Covers identity (email), role, optional password reset, AND
          scope (region + city) in one form. Save dispatches editMutation
          and scopeMutation in sequence and only closes on both success. */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>
              Update identity, role, password, and organizational scope.
              Region + City control which safehouses a Staff or Location
              Manager can see — case and whitespace must match the safehouse
              row exactly (e.g. <code>Visayas</code> / <code>Cebu City</code>).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-password">
                Password{" "}
                <span className="text-muted-foreground font-normal">
                  (leave blank to keep current)
                </span>
              </Label>
              <div className="relative">
                <Input
                  id="edit-password"
                  type={showEditPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={editForm.newPassword}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, newPassword: e.target.value }))
                  }
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowEditPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={
                    showEditPassword ? "Hide password" : "Show password"
                  }
                >
                  {showEditPassword ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select
                value={editForm.role}
                onValueChange={(v) =>
                  setEditForm((f) => ({ ...f, role: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Donor">Donor</SelectItem>
                  <SelectItem value="Staff">Staff</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Scope fields */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
              <div className="space-y-1">
                <Label htmlFor="edit-region">Region</Label>
                <Input
                  id="edit-region"
                  value={editForm.region}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, region: e.target.value }))
                  }
                  placeholder="e.g. Visayas"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-city">City</Label>
                <Input
                  id="edit-city"
                  value={editForm.city}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, city: e.target.value }))
                  }
                  placeholder="e.g. Cebu City"
                />
              </div>
            </div>

            {editError && (
              <p className="text-sm text-destructive">{editError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={savingEdit}
            >
              Cancel
            </Button>
            <Button
              variant="hero"
              disabled={savingEdit || !editForm.email}
              onClick={handleSaveEdit}
            >
              {savingEdit ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add user dialog ────────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add new user</DialogTitle>
            <DialogDescription>
              Fill in the details below to create a new account. Region and
              City can be set afterwards from the user list.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="new-email">Email</Label>
              <Input
                id="new-email"
                type="email"
                autoComplete="email"
                placeholder="you@ember-ngo.org"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-password">Password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-confirm">Confirm password</Label>
              <Input
                id="new-confirm"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={form.confirm}
                onChange={(e) =>
                  setForm((f) => ({ ...f, confirm: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Donor">Donor</SelectItem>
                  <SelectItem value="Staff">Staff</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="hero"
              disabled={
                createMutation.isPending ||
                !form.email ||
                !form.password ||
                !form.confirm
              }
              onClick={handleCreate}
            >
              {createMutation.isPending ? "Creating…" : "Create user"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Admin;
