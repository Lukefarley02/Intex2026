import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Plus,
  UserCircle,
  Pencil,
  Trash2,
  Heart,
  Brain,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/api/client";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useAuth } from "@/api/AuthContext";
import { toast } from "@/hooks/use-toast";

// ---- Types matching /api/residents projection (list) ----
interface ResidentRow {
  residentId: number;
  safehouseId: number;
  caseControlNo: string | null;
  internalCode: string | null;
  caseStatus: string | null;
  dateOfBirth: string | null;
  dateOfAdmission: string | null;
  currentRiskLevel: string | null;
  notesRestricted?: string | null; // Admin only
  safehouse: { name: string } | null;
}

// Minimal safehouse shape for the dropdown in the form.
interface SafehouseOption {
  safehouseId: number;
  name: string;
}

// Full Resident entity returned by GET /api/residents/{id}. Matches
// backend/Models/Resident.cs so PUT can round-trip. Nullable fields
// are kept unknown and simply re-sent back untouched.
interface ResidentEntity {
  residentId: number;
  safehouseId: number;
  caseControlNo: string | null;
  internalCode: string | null;
  caseStatus: string | null;
  sex: string | null;
  dateOfBirth: string | null;
  dateOfAdmission: string | null;
  currentRiskLevel: string | null;
  notesRestricted: string | null;
  assignedSocialWorker: string | null;
  // Everything else on the entity is carried along as-is so PUT
  // doesn't wipe out categorical flags. We don't type each field
  // individually — they ride in via spread.
  [key: string]: unknown;
}

// ---- Helpers ----

// Map whatever `case_status` the database stores into one of the four
// program stages we visualize at the bottom of each card.
const stageSteps = ["Intake", "Program", "Exit prep", "Follow-up"] as const;
type Stage = (typeof stageSteps)[number];

const statusColor: Record<string, string> = {
  Active: "bg-success/10 text-success border-success/20",
  Open: "bg-success/10 text-success border-success/20",
  Transitioning: "bg-gold/10 text-gold border-gold/20",
  Exited: "bg-muted text-muted-foreground",
  Closed: "bg-muted text-muted-foreground",
  "Follow-up": "bg-secondary/10 text-secondary border-secondary/20",
};

const riskColor: Record<string, string> = {
  low: "bg-success/10 text-success border-success/20",
  medium: "bg-gold/10 text-gold border-gold/20",
  high: "bg-primary/10 text-primary border-primary/20",
  critical: "bg-primary/20 text-primary border-primary/40",
};

const deriveStage = (r: ResidentRow): Stage => {
  const s = (r.caseStatus ?? "").toLowerCase();
  if (s.includes("intake")) return "Intake";
  if (s.includes("exit") || s.includes("transition")) return "Exit prep";
  if (s.includes("follow")) return "Follow-up";
  if (s.includes("closed") || s.includes("reintegrated")) return "Follow-up";
  return "Program";
};

const displayName = (r: ResidentRow) =>
  r.internalCode || r.caseControlNo || `Resident #${r.residentId}`;

const statusLabel = (r: ResidentRow) => r.caseStatus || "Unknown";

// Sentinel value used in all dropdowns to mean "no filter applied". Using
// a non-empty string is required because Radix's Select treats empty
// string as a reset and throws a dev warning.
const ANY = "__any__";

// Case status filter options. The canonical schema allows three values:
// Active, Closed, Transferred.
const statusOptions = ["Active", "Closed", "Transferred"] as const;

// Risk-level filter options. Matches the four values used by the
// `currentRiskLevel` column and the riskColor map above.
const priorityOptions = ["low", "medium", "high", "critical"] as const;

// yyyy-MM-dd helper for <input type="date">.
const toDateInput = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

// Empty skeleton used when opening the create dialog. We build a minimal
// entity from scratch; most fields stay null on the server because the
// schema defines them as nullable.
const emptyEntity = (): ResidentEntity => ({
  residentId: 0,
  safehouseId: 0,
  caseControlNo: null,
  internalCode: null,
  caseStatus: "Active",
  sex: null,
  dateOfBirth: null,
  dateOfAdmission: new Date().toISOString(),
  currentRiskLevel: "low",
  notesRestricted: null,
  assignedSocialWorker: null,
});

const Residents = () => {
  const qc = useQueryClient();
  const { hasRole } = useAuth();
  const canWrite = hasRole("Admin") || hasRole("Staff");
  const canDelete = hasRole("Admin"); // backend: Admin-only DELETE

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(ANY);
  const [safehouseFilter, setSafehouseFilter] = useState<string>(ANY);
  const [priorityFilter, setPriorityFilter] = useState<string>(ANY);

  const { data, isLoading, isError } = useQuery<ResidentRow[]>({
    queryKey: ["residents"],
    queryFn: () => apiFetch<ResidentRow[]>("/api/residents"),
  });

  // Safehouse list — needed for the form dropdown so users can assign
  // residents to houses they have scope to see.
  const { data: safehouseList } = useQuery<SafehouseOption[]>({
    queryKey: ["safehouses"],
    queryFn: () => apiFetch<SafehouseOption[]>("/api/safehouses"),
  });

  const residents = data ?? [];

  // Unique list of safehouse names present in the data set, for the
  // safehouse filter dropdown. Sorted alphabetically so the menu is
  // predictable.
  const safehouseOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of residents) {
      if (r.safehouse?.name) set.add(r.safehouse.name);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [residents]);

  const filtered = useMemo(() => {
    let rows = residents;
    if (statusFilter !== ANY) {
      rows = rows.filter((r) => (r.caseStatus ?? "").trim() === statusFilter);
    }
    if (safehouseFilter !== ANY) {
      rows = rows.filter((r) => (r.safehouse?.name ?? "") === safehouseFilter);
    }
    if (priorityFilter !== ANY) {
      rows = rows.filter(
        (r) => (r.currentRiskLevel ?? "").toLowerCase() === priorityFilter,
      );
    }
    if (search.trim().length === 0) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => {
      const hay = [
        displayName(r),
        r.safehouse?.name ?? "",
        r.caseStatus ?? "",
        r.currentRiskLevel ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [residents, search, statusFilter, safehouseFilter, priorityFilter]);

  // ---- Dialog state ----
  const [formOpen, setFormOpen] = useState(false);
  const [entity, setEntity] = useState<ResidentEntity>(emptyEntity());
  const [toDelete, setToDelete] = useState<ResidentRow | null>(null);
  const isEditing = entity.residentId !== 0;

  const openCreate = () => {
    const next = emptyEntity();
    // Pre-select the first accessible safehouse so the form starts valid.
    if (safehouseList && safehouseList.length > 0) {
      next.safehouseId = safehouseList[0].safehouseId;
    }
    setEntity(next);
    setFormOpen(true);
  };

  const openEdit = async (row: ResidentRow) => {
    try {
      const full = await apiFetch<ResidentEntity>(
        `/api/residents/${row.residentId}`,
      );
      setEntity(full);
      setFormOpen(true);
    } catch (e) {
      toast({
        title: "Could not load resident",
        description: (e as Error).message,
        variant: "destructive",
      });
    }
  };

  // Serialize the entity into the JSON shape the backend PUT/POST accept.
  // The key trick here: we spread `entity` first so every unknown field
  // from the GET round-trips untouched, then overwrite with trimmed /
  // typed versions of the fields the form edits. Dates are converted
  // from the yyyy-MM-dd <input> value back to ISO datetimes.
  const toPayload = (e: ResidentEntity) => ({
    ...e,
    dateOfBirth: e.dateOfBirth
      ? new Date(e.dateOfBirth).toISOString()
      : null,
    dateOfAdmission: e.dateOfAdmission
      ? new Date(e.dateOfAdmission).toISOString()
      : null,
  });

  const createMut = useMutation({
    mutationFn: (payload: ResidentEntity) =>
      apiFetch<ResidentEntity>("/api/residents", {
        method: "POST",
        body: JSON.stringify(toPayload(payload)),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["residents"] });
      qc.invalidateQueries({ queryKey: ["safehouses"] });
      toast({ title: "Resident created" });
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
    mutationFn: (payload: ResidentEntity) =>
      apiFetch<void>(`/api/residents/${payload.residentId}`, {
        method: "PUT",
        body: JSON.stringify(toPayload(payload)),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["residents"] });
      qc.invalidateQueries({ queryKey: ["safehouses"] });
      toast({ title: "Resident updated" });
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
      apiFetch<void>(`/api/residents/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["residents"] });
      qc.invalidateQueries({ queryKey: ["safehouses"] });
      toast({ title: "Resident deleted" });
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
    if (!entity.safehouseId) {
      toast({
        title: "Safehouse is required",
        variant: "destructive",
      });
      return;
    }
    if (isEditing) {
      updateMut.mutate(entity);
    } else {
      createMut.mutate(entity);
    }
  };

  const saving = createMut.isPending || updateMut.isPending;

  // Shortcut for setting a single field on the entity without losing
  // the rest of the fields in a shallow clone.
  const setField = <K extends keyof ResidentEntity>(
    key: K,
    value: ResidentEntity[K],
  ) => setEntity((prev) => ({ ...prev, [key]: value }));

  return (
    <DashboardLayout title="Residents">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by ID, safehouse, or status..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {canWrite && (
          <Button variant="hero" size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" /> Add resident
          </Button>
        )}
      </div>

      {/* Filter dropdowns. Each one narrows the resident list client-side
          on top of whatever the search box is doing. "Any" resets that
          dimension. All three compose as AND filters. */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground font-medium">
            Case status
          </label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Any status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any status</SelectItem>
              {statusOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground font-medium">
            Safehouse
          </label>
          <Select value={safehouseFilter} onValueChange={setSafehouseFilter}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Any safehouse" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any safehouse</SelectItem>
              {safehouseOptions.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground font-medium">
            Priority
          </label>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Any priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any priority</SelectItem>
              {priorityOptions.map((p) => (
                <SelectItem key={p} value={p} className="capitalize">
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {(statusFilter !== ANY ||
          safehouseFilter !== ANY ||
          priorityFilter !== ANY) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-end"
            onClick={() => {
              setStatusFilter(ANY);
              setSafehouseFilter(ANY);
              setPriorityFilter(ANY);
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* ML Pipeline quick-link — Admin/Staff */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            ML Insights
          </h2>
        </div>
        <Link to="/ml-insights?tab=outcomes" className="group block max-w-sm">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Pipeline 04</p>
                <p className="text-sm font-semibold text-emerald-700">Resident Outcomes</p>
              </div>
              <Heart className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            </div>
            <p className="text-xs text-emerald-600/80 mb-2">
              Which residents are progressing toward reintegration? Risk-scores each resident and identifies readiness tiers.
            </p>
            <span className="text-xs font-medium text-emerald-600 group-hover:underline">
              View outcomes analysis →
            </span>
          </div>
        </Link>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading residents…</p>
      )}
      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          Could not load residents from the server.
        </div>
      )}
      {!isLoading && !isError && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">No residents found.</p>
      )}

      {!isLoading && filtered.length > 0 && (
        <p className="text-xs text-muted-foreground mb-2">
          Showing {filtered.length} of {residents.length} residents
        </p>
      )}

      <div className="grid gap-4">
        {filtered.map((r) => {
          const stage = deriveStage(r);
          const stageIndex = stageSteps.indexOf(stage);
          const status = statusLabel(r);
          const risk = (r.currentRiskLevel ?? "").toLowerCase();

          return (
            <Card key={r.residentId} className="rounded-xl shadow-sm">
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-full bg-secondary/10 flex items-center justify-center">
                      <UserCircle className="w-6 h-6 text-secondary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{displayName(r)}</p>
                        <span className="text-xs text-muted-foreground">
                          (#{r.residentId})
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {r.safehouse?.name ?? "Unassigned"}
                        {r.dateOfAdmission
                          ? ` · Since ${r.dateOfAdmission.slice(0, 10)}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {risk && (
                      <Badge
                        variant="outline"
                        className={riskColor[risk] ?? ""}
                      >
                        {risk}
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={statusColor[status] || ""}
                    >
                      {status}
                    </Badge>
                    {canWrite && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(r)}
                        aria-label={`Edit ${displayName(r)}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => setToDelete(r)}
                        aria-label={`Delete ${displayName(r)}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Progress tracker */}
                <div className="mt-4 flex items-center gap-1">
                  {stageSteps.map((step, i) => (
                    <div key={step} className="flex-1">
                      <div
                        className={`h-1.5 rounded-full ${
                          i <= stageIndex ? "bg-success" : "bg-muted"
                        }`}
                      />
                      <p
                        className={`text-[10px] mt-1 ${
                          i <= stageIndex
                            ? "text-success font-medium"
                            : "text-muted-foreground"
                        }`}
                      >
                        {step}
                      </p>
                    </div>
                  ))}
                </div>
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
              {isEditing ? "Edit resident" : "New resident"}
            </DialogTitle>
            <DialogDescription>
              Only the core case fields are editable here. Categorical
              flags and extended history live in the individual resident
              detail view.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="r-control">Case control #</Label>
                <Input
                  id="r-control"
                  value={entity.caseControlNo ?? ""}
                  onChange={(e) => setField("caseControlNo", e.target.value)}
                  placeholder="e.g. 2026-0042"
                />
              </div>
              <div>
                <Label htmlFor="r-code">Internal code</Label>
                <Input
                  id="r-code"
                  value={entity.internalCode ?? ""}
                  onChange={(e) => setField("internalCode", e.target.value)}
                  placeholder="e.g. LHS2-07"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="r-safehouse">Safehouse *</Label>
              <select
                id="r-safehouse"
                className="w-full border rounded-md h-10 px-3 bg-background"
                value={entity.safehouseId}
                onChange={(e) =>
                  setField("safehouseId", Number(e.target.value))
                }
                required
              >
                <option value={0}>Select a safehouse…</option>
                {(safehouseList ?? []).map((s) => (
                  <option key={s.safehouseId} value={s.safehouseId}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="r-status">Case status</Label>
                <select
                  id="r-status"
                  className="w-full border rounded-md h-10 px-3 bg-background"
                  value={entity.caseStatus ?? "Active"}
                  onChange={(e) => setField("caseStatus", e.target.value)}
                >
                  <option>Active</option>
                  <option>Closed</option>
                  <option>Transferred</option>
                </select>
              </div>
              <div>
                <Label htmlFor="r-risk">Risk level</Label>
                <select
                  id="r-risk"
                  className="w-full border rounded-md h-10 px-3 bg-background"
                  value={entity.currentRiskLevel ?? "low"}
                  onChange={(e) =>
                    setField("currentRiskLevel", e.target.value)
                  }
                >
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                  <option value="critical">critical</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="r-dob">Date of birth</Label>
                <Input
                  id="r-dob"
                  type="date"
                  value={toDateInput(entity.dateOfBirth)}
                  onChange={(e) =>
                    setField(
                      "dateOfBirth",
                      e.target.value
                        ? new Date(e.target.value).toISOString()
                        : null,
                    )
                  }
                />
              </div>
              <div>
                <Label htmlFor="r-admission">Admission date</Label>
                <Input
                  id="r-admission"
                  type="date"
                  value={toDateInput(entity.dateOfAdmission)}
                  onChange={(e) =>
                    setField(
                      "dateOfAdmission",
                      e.target.value
                        ? new Date(e.target.value).toISOString()
                        : null,
                    )
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="r-sex">Sex</Label>
                <Input
                  id="r-sex"
                  value={entity.sex ?? ""}
                  onChange={(e) => setField("sex", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="r-worker">Assigned social worker</Label>
                <Input
                  id="r-worker"
                  value={entity.assignedSocialWorker ?? ""}
                  onChange={(e) =>
                    setField("assignedSocialWorker", e.target.value)
                  }
                />
              </div>
            </div>

            {/* Restricted notes (admin-only on the backend — Staff callers
                will receive null and the field will look empty). */}
            {hasRole("Admin") && (
              <div>
                <Label htmlFor="r-notes">
                  Restricted notes (admin-only)
                </Label>
                <Textarea
                  id="r-notes"
                  rows={3}
                  value={entity.notesRestricted ?? ""}
                  onChange={(e) =>
                    setField("notesRestricted", e.target.value)
                  }
                  placeholder="Sensitive case notes. Not visible to Staff."
                />
              </div>
            )}

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
                    : "Create resident"}
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
        title="Delete resident?"
        description={
          toDelete
            ? `This permanently deletes the case record for ${displayName(toDelete)}. Process recordings, visitations, and other linked history may also become orphaned. This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete resident"
        loading={deleteMut.isPending}
        onConfirm={() => {
          if (toDelete) deleteMut.mutate(toDelete.residentId);
        }}
      />
    </DashboardLayout>
  );
};

export default Residents;
