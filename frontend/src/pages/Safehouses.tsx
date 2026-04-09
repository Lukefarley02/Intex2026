import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Home, MapPin, Users, Plus, Pencil, Trash2, Building2, Brain, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/api/client";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useAuth } from "@/api/AuthContext";
import { toast } from "@/hooks/use-toast";

// ---- Types matching /api/safehouses projection ----
interface SafehouseRow {
  safehouseId: number;
  safehouseCode: string | null;
  name: string;
  region: string | null;
  province: string | null;
  city: string | null;
  country: string | null;
  status: string | null;
  openDate: string | null;
  capacityGirls: number | null;
  capacityStaff: number | null;
  storedOccupancy: number | null;
  activeResidents: number;
}

// ---- Full entity shape that POST/PUT send back to the API ----
// Matches `backend/Models/Safehouse.cs` exactly. Server ignores
// `safehouseId` on POST (it's generated) and `currentOccupancy` is
// recomputed by ResidentsController write paths, so we leave it at 0
// on the client form.
interface SafehouseForm {
  safehouseId: number;
  safehouseCode: string;
  name: string;
  region: string;
  province: string;
  city: string;
  country: string;
  status: string;
  openDate: string; // ISO yyyy-MM-dd
  capacityGirls: number;
  capacityStaff: number;
  notes: string;
}

const emptyForm: SafehouseForm = {
  safehouseId: 0,
  safehouseCode: "",
  name: "",
  region: "",
  province: "",
  city: "",
  country: "",
  status: "Active",
  openDate: "",
  capacityGirls: 0,
  capacityStaff: 0,
  notes: "",
};

const formatLocation = (sh: SafehouseRow) => {
  const parts = [sh.city, sh.province ?? sh.region, sh.country].filter(
    (p): p is string => !!p && p.trim().length > 0,
  );
  return parts.length > 0 ? parts.join(", ") : "Location not set";
};

// Helper: convert an ISO date to the yyyy-MM-dd value <input type="date">
// expects. Returns an empty string for null/invalid input.
const toDateInput = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

// Serialize the form into the JSON shape the backend expects. We null out
// empty strings and convert the date input back to an ISO datetime so EF
// Core's DateTime? column accepts it. `currentOccupancy` is intentionally
// set to 0 — ResidentsController recalculates it from the live Active
// count on every resident write.
const toPayload = (f: SafehouseForm) => ({
  safehouseId: f.safehouseId,
  safehouseCode: f.safehouseCode.trim() || null,
  name: f.name.trim(),
  region: f.region.trim() || null,
  province: f.province.trim() || null,
  city: f.city.trim() || null,
  country: f.country.trim() || null,
  status: f.status.trim() || null,
  openDate: f.openDate ? new Date(f.openDate).toISOString() : null,
  capacityGirls: Number.isFinite(f.capacityGirls) ? f.capacityGirls : null,
  capacityStaff: Number.isFinite(f.capacityStaff) ? f.capacityStaff : null,
  currentOccupancy: 0,
  notes: f.notes.trim() || null,
});

const Safehouses = () => {
  const qc = useQueryClient();
  const { hasRole, isFounder } = useAuth();
  const canWrite = hasRole("Admin"); // backend gates on Founder further

  const { data, isLoading, isError } = useQuery<SafehouseRow[]>({
    queryKey: ["safehouses"],
    queryFn: () => apiFetch<SafehouseRow[]>("/api/safehouses"),
  });

  const safehouses = data ?? [];

  // ---- Dialog state ----
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<SafehouseForm>(emptyForm);
  const [toDelete, setToDelete] = useState<SafehouseRow | null>(null);

  const isEditing = editingId !== null;

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = async (row: SafehouseRow) => {
    // The list endpoint already returns most of what we need, but `notes`
    // and `safehouseCode` are not in that projection. Fetch the full entity
    // so the edit form round-trips faithfully.
    try {
      const full = await apiFetch<{
        safehouseId: number;
        safehouseCode: string | null;
        name: string;
        region: string | null;
        province: string | null;
        city: string | null;
        country: string | null;
        status: string | null;
        openDate: string | null;
        capacityGirls: number | null;
        capacityStaff: number | null;
        notes: string | null;
      }>(`/api/safehouses/${row.safehouseId}`);
      setEditingId(row.safehouseId);
      setForm({
        safehouseId: full.safehouseId,
        safehouseCode: full.safehouseCode ?? "",
        name: full.name,
        region: full.region ?? "",
        province: full.province ?? "",
        city: full.city ?? "",
        country: full.country ?? "",
        status: full.status ?? "Active",
        openDate: toDateInput(full.openDate),
        capacityGirls: full.capacityGirls ?? 0,
        capacityStaff: full.capacityStaff ?? 0,
        notes: full.notes ?? "",
      });
      setFormOpen(true);
    } catch (e) {
      toast({
        title: "Could not load safehouse",
        description: (e as Error).message,
        variant: "destructive",
      });
    }
  };

  const createMut = useMutation({
    mutationFn: (payload: SafehouseForm) =>
      apiFetch<SafehouseRow>("/api/safehouses", {
        method: "POST",
        body: JSON.stringify(toPayload(payload)),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["safehouses"] });
      toast({ title: "Safehouse created" });
      setFormOpen(false);
    },
    onError: (e: Error) =>
      toast({
        title: "Create failed",
        description: e.message,
        variant: "destructive",
      }),
  });

  const updateMut = useMutation({
    mutationFn: (payload: SafehouseForm) =>
      apiFetch<void>(`/api/safehouses/${payload.safehouseId}`, {
        method: "PUT",
        body: JSON.stringify(toPayload(payload)),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["safehouses"] });
      toast({ title: "Safehouse updated" });
      setFormOpen(false);
    },
    onError: (e: Error) =>
      toast({
        title: "Update failed",
        description: e.message,
        variant: "destructive",
      }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) =>
      apiFetch<void>(`/api/safehouses/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["safehouses"] });
      toast({ title: "Safehouse deleted" });
      setToDelete(null);
    },
    onError: (e: Error) =>
      toast({
        title: "Delete failed",
        description: e.message,
        variant: "destructive",
      }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({
        title: "Name is required",
        variant: "destructive",
      });
      return;
    }
    if (isEditing) {
      updateMut.mutate(form);
    } else {
      createMut.mutate(form);
    }
  };

  const saving = createMut.isPending || updateMut.isPending;

  return (
    <DashboardLayout title="Safehouse Management">
      <div className="flex items-center justify-between mb-6">
        <p className="text-muted-foreground text-sm">
          {isLoading
            ? "Loading safehouses…"
            : `${safehouses.length} safehouse${safehouses.length === 1 ? "" : "s"}`}
        </p>
        {canWrite && (
          <Button variant="hero" size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" /> Add safehouse
          </Button>
        )}
      </div>

      {/* ML Insights quick-link — Founder only */}
      {isFounder && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground mr-1">
            <Brain className="w-3.5 h-3.5" /> ML Insights:
          </span>
          <Link
            to="/ml-insights?tab=geographic"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
          >
            <Building2 className="w-3.5 h-3.5 text-indigo-500" />
            Safehouse Performance
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          </Link>
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive mb-4">
          Could not load safehouses from the server.
        </div>
      )}

      {!isLoading && !isError && safehouses.length === 0 && (
        <p className="text-sm text-muted-foreground">No safehouses found.</p>
      )}

      <div className="grid sm:grid-cols-2 gap-5">
        {safehouses.map((sh) => {
          const capacity = sh.capacityGirls ?? 0;
          const current = sh.activeResidents ?? sh.storedOccupancy ?? 0;
          const pct = capacity > 0 ? Math.min((current / capacity) * 100, 100) : 0;
          const nearCapacity = capacity > 0 && current / capacity > 0.9;
          const displayStatus =
            sh.status || (nearCapacity ? "Near capacity" : "Active");

          return (
            <Card
              key={sh.safehouseId}
              className="rounded-xl shadow-sm hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Home className="w-4 h-4 text-secondary" /> {sh.name}
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className={
                      nearCapacity
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-success/10 text-success border-success/20"
                    }
                  >
                    {displayStatus}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" /> {formatLocation(sh)}
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> Residents
                    </span>
                    <span className="font-medium">
                      {current}
                      {capacity > 0 ? `/${capacity}` : ""}
                    </span>
                  </div>
                  <Progress value={pct} className="h-2.5" />
                </div>

                {sh.capacityStaff != null && (
                  <div className="text-sm text-muted-foreground">
                    Staff capacity: {sh.capacityStaff}
                  </div>
                )}

                {canWrite && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openEdit(sh)}
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => setToDelete(sh)}
                      aria-label={`Delete ${sh.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ---- Create / Edit dialog ---- */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit safehouse" : "New safehouse"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update the details for this location."
                : "Founder-only. Regional and location managers cannot add safehouses."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sh-name">Name *</Label>
                <Input
                  id="sh-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="sh-code">Safehouse code</Label>
                <Input
                  id="sh-code"
                  value={form.safehouseCode}
                  onChange={(e) =>
                    setForm({ ...form, safehouseCode: e.target.value })
                  }
                  placeholder="e.g. LHS-04"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sh-city">City</Label>
                <Input
                  id="sh-city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="sh-province">Province</Label>
                <Input
                  id="sh-province"
                  value={form.province}
                  onChange={(e) =>
                    setForm({ ...form, province: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sh-region">Region</Label>
                <Input
                  id="sh-region"
                  value={form.region}
                  onChange={(e) =>
                    setForm({ ...form, region: e.target.value })
                  }
                  placeholder="e.g. West"
                />
              </div>
              <div>
                <Label htmlFor="sh-country">Country</Label>
                <Input
                  id="sh-country"
                  value={form.country}
                  onChange={(e) =>
                    setForm({ ...form, country: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sh-status">Status</Label>
                <select
                  id="sh-status"
                  className="w-full border rounded-md h-10 px-3 bg-background"
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value })
                  }
                >
                  <option value="Active">Active</option>
                  <option value="Paused">Paused</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
              <div>
                <Label htmlFor="sh-open">Open date</Label>
                <Input
                  id="sh-open"
                  type="date"
                  value={form.openDate}
                  onChange={(e) =>
                    setForm({ ...form, openDate: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sh-cap-girls">Capacity (girls)</Label>
                <Input
                  id="sh-cap-girls"
                  type="number"
                  min={0}
                  value={form.capacityGirls}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      capacityGirls: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="sh-cap-staff">Capacity (staff)</Label>
                <Input
                  id="sh-cap-staff"
                  type="number"
                  min={0}
                  value={form.capacityStaff}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      capacityStaff: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="sh-notes">Notes</Label>
              <Input
                id="sh-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving
                  ? "Saving…"
                  : isEditing
                    ? "Save changes"
                    : "Create safehouse"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ---- Delete confirmation ---- */}
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => {
          if (!v) setToDelete(null);
        }}
        title="Delete safehouse?"
        description={
          toDelete
            ? `This permanently deletes "${toDelete.name}". Residents assigned to this house will lose their home record. This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete safehouse"
        loading={deleteMut.isPending}
        onConfirm={() => {
          if (toDelete) deleteMut.mutate(toDelete.safehouseId);
        }}
      />
    </DashboardLayout>
  );
};

export default Safehouses;
