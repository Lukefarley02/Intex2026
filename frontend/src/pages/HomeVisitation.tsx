import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, MapPin, AlertTriangle, Calendar, Home as HomeIcon, Pencil, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/api/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/api/AuthContext";
import ConfirmDialog from "@/components/ConfirmDialog";

// ---- Types ----
interface ResidentRow {
  residentId: number;
  caseControlNo: string | null;
  internalCode: string | null;
  safehouse: { name: string } | null;
}

interface HomeVisitationRow {
  visitationId: number;
  residentId: number;
  visitDate: string | null;
  visitType: string | null;
  purpose: string | null;
  locationVisited: string | null;
  familyMembersPresent: string | null;
  familyCooperationLevel: string | null;
  observations: string | null;
  safetyConcernsNoted: boolean | null;
  followUpNeeded: boolean | null;
  followUpNotes: string | null;
  visitOutcome: string | null;
  socialWorker: string | null;
  createdByUserId: string | null;
  // Server-computed: true if the current user is allowed to edit/delete.
  // Admins can always modify; Staff can only modify rows they created.
  canModify: boolean;
}

const displayName = (r: ResidentRow) =>
  r.internalCode || r.caseControlNo || `Resident #${r.residentId}`;

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";

const isUpcoming = (d: string | null) => {
  if (!d) return false;
  return new Date(d).getTime() > Date.now();
};

const cooperationColor: Record<string, string> = {
  high: "bg-success/10 text-success border-success/20",
  medium: "bg-gold/10 text-gold border-gold/20",
  low: "bg-primary/10 text-primary border-primary/20",
  none: "bg-muted text-muted-foreground",
};

interface FormState {
  visitationId: number; // 0 when creating
  residentId: number;
  visitDate: string;
  visitType: string;
  purpose: string;
  locationVisited: string;
  familyMembersPresent: string;
  familyCooperationLevel: string;
  observations: string;
  safetyConcernsNoted: boolean;
  followUpNeeded: boolean;
  followUpNotes: string;
  visitOutcome: string;
  socialWorker: string;
}

const emptyForm: FormState = {
  visitationId: 0,
  residentId: 0,
  visitDate: new Date().toISOString().slice(0, 10),
  visitType: "Routine follow-up",
  purpose: "",
  locationVisited: "",
  familyMembersPresent: "",
  familyCooperationLevel: "high",
  observations: "",
  safetyConcernsNoted: false,
  followUpNeeded: false,
  followUpNotes: "",
  visitOutcome: "",
  socialWorker: "",
};

const toFormState = (v: HomeVisitationRow): FormState => ({
  visitationId: v.visitationId,
  residentId: v.residentId,
  visitDate: v.visitDate ? v.visitDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
  visitType: v.visitType ?? "Routine follow-up",
  purpose: v.purpose ?? "",
  locationVisited: v.locationVisited ?? "",
  familyMembersPresent: v.familyMembersPresent ?? "",
  familyCooperationLevel: v.familyCooperationLevel ?? "high",
  observations: v.observations ?? "",
  safetyConcernsNoted: !!v.safetyConcernsNoted,
  followUpNeeded: !!v.followUpNeeded,
  followUpNotes: v.followUpNotes ?? "",
  visitOutcome: v.visitOutcome ?? "",
  socialWorker: v.socialWorker ?? "",
});

const HomeVisitation = () => {
  const qc = useQueryClient();
  // `useAuth` is still imported so future changes can re-introduce a
  // role derivation if needed. Per-row edit/delete visibility is now
  // driven by the server's `canModify` flag on each row.
  useAuth();
  const [selectedResident, setSelectedResident] = useState<number | "all">("all");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<HomeVisitationRow | null>(null);

  const { data: residents } = useQuery<ResidentRow[]>({
    queryKey: ["residents"],
    queryFn: () => apiFetch<ResidentRow[]>("/api/residents"),
  });

  const { data: visits, isLoading } = useQuery<HomeVisitationRow[]>({
    queryKey: ["home-visitations", selectedResident],
    queryFn: () =>
      apiFetch<HomeVisitationRow[]>(
        selectedResident === "all"
          ? "/api/homevisitations"
          : `/api/homevisitations?residentId=${selectedResident}`,
      ),
  });

  const buildPayload = (f: FormState) => ({
    visitationId: f.visitationId,
    residentId: f.residentId,
    visitDate: new Date(f.visitDate).toISOString(),
    visitType: f.visitType,
    purpose: f.purpose,
    locationVisited: f.locationVisited,
    familyMembersPresent: f.familyMembersPresent,
    familyCooperationLevel: f.familyCooperationLevel,
    observations: f.observations,
    safetyConcernsNoted: f.safetyConcernsNoted,
    followUpNeeded: f.followUpNeeded,
    followUpNotes: f.followUpNotes,
    visitOutcome: f.visitOutcome,
    socialWorker: f.socialWorker,
  });

  const saveMut = useMutation({
    mutationFn: async (f: FormState) => {
      if (f.visitationId === 0) {
        return apiFetch<HomeVisitationRow>("/api/homevisitations", {
          method: "POST",
          body: JSON.stringify(buildPayload(f)),
        });
      }
      await apiFetch<void>(`/api/homevisitations/${f.visitationId}`, {
        method: "PUT",
        body: JSON.stringify(buildPayload(f)),
      });
      return null;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["home-visitations"] });
      toast({
        title: editingId ? "Visit updated" : "Visit logged",
        description: "Home visitation saved successfully.",
      });
      setOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: (e: Error) => {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) =>
      apiFetch<void>(`/api/homevisitations/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["home-visitations"] });
      toast({ title: "Visit deleted" });
      setDeleteTarget(null);
    },
    onError: (e: Error) => {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    },
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (v: HomeVisitationRow) => {
    setEditingId(v.visitationId);
    setForm(toFormState(v));
    setOpen(true);
  };

  const residentLookup = useMemo(() => {
    const m = new Map<number, ResidentRow>();
    (residents ?? []).forEach((r) => m.set(r.residentId, r));
    return m;
  }, [residents]);

  const upcoming = useMemo(
    () => (visits ?? []).filter((v) => isUpcoming(v.visitDate)),
    [visits],
  );
  const history = useMemo(
    () => (visits ?? []).filter((v) => !isUpcoming(v.visitDate)),
    [visits],
  );

  return (
    <DashboardLayout title="Home Visitation & Case Conferences">
      <div className="max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <HomeIcon className="w-6 h-6 text-primary" /> Home & Field Visits
            </h2>
            <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
              Log home visits, field assessments, and case conferences. Track family
              cooperation, safety concerns, and follow-up actions.
            </p>
          </div>
          <Dialog
            open={open}
            onOpenChange={(o) => {
              setOpen(o);
              if (!o) {
                setEditingId(null);
                setForm(emptyForm);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={openCreate}>
                <Plus className="w-4 h-4" /> Log Visit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Edit Home Visit" : "Log a Home Visit"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label>Resident</Label>
                  <select
                    className="w-full border rounded-md h-10 px-3 bg-background"
                    value={form.residentId}
                    onChange={(e) => setForm({ ...form, residentId: Number(e.target.value) })}
                  >
                    <option value={0}>Select a resident…</option>
                    {(residents ?? []).map((r) => (
                      <option key={r.residentId} value={r.residentId}>
                        {displayName(r)} {r.safehouse ? `· ${r.safehouse.name}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Visit date</Label>
                    <Input
                      type="date"
                      value={form.visitDate}
                      onChange={(e) => setForm({ ...form, visitDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Visit type</Label>
                    <select
                      className="w-full border rounded-md h-10 px-3 bg-background"
                      value={form.visitType}
                      onChange={(e) => setForm({ ...form, visitType: e.target.value })}
                    >
                      <option>Initial assessment</option>
                      <option>Routine follow-up</option>
                      <option>Reintegration assessment</option>
                      <option>Post-placement monitoring</option>
                      <option>Emergency</option>
                      <option>Case conference</option>
                    </select>
                  </div>
                </div>
                <div>
                  <Label>Purpose</Label>
                  <Input
                    value={form.purpose}
                    onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Location visited</Label>
                    <Input
                      value={form.locationVisited}
                      onChange={(e) => setForm({ ...form, locationVisited: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Family cooperation</Label>
                    <select
                      className="w-full border rounded-md h-10 px-3 bg-background"
                      value={form.familyCooperationLevel}
                      onChange={(e) =>
                        setForm({ ...form, familyCooperationLevel: e.target.value })
                      }
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                </div>
                <div>
                  <Label>Family members present</Label>
                  <Input
                    value={form.familyMembersPresent}
                    onChange={(e) => setForm({ ...form, familyMembersPresent: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Observations</Label>
                  <Textarea
                    rows={3}
                    value={form.observations}
                    onChange={(e) => setForm({ ...form, observations: e.target.value })}
                    placeholder="Home environment, interactions, concerns…"
                  />
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.safetyConcernsNoted}
                      onChange={(e) =>
                        setForm({ ...form, safetyConcernsNoted: e.target.checked })
                      }
                    />
                    Safety concerns noted
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.followUpNeeded}
                      onChange={(e) => setForm({ ...form, followUpNeeded: e.target.checked })}
                    />
                    Follow-up needed
                  </label>
                </div>
                <div>
                  <Label>Follow-up notes</Label>
                  <Textarea
                    rows={2}
                    value={form.followUpNotes}
                    onChange={(e) => setForm({ ...form, followUpNotes: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Visit outcome</Label>
                    <Input
                      value={form.visitOutcome}
                      onChange={(e) => setForm({ ...form, visitOutcome: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Social worker</Label>
                    <Input
                      value={form.socialWorker}
                      onChange={(e) => setForm({ ...form, socialWorker: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => saveMut.mutate(form)}
                  disabled={!form.residentId || saveMut.isPending}
                >
                  {saveMut.isPending
                    ? "Saving…"
                    : editingId
                      ? "Save Changes"
                      : "Save Visit"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filter */}
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Label className="text-sm">Filter by resident:</Label>
            <select
              className="border rounded-md h-9 px-3 bg-background text-sm"
              value={selectedResident}
              onChange={(e) =>
                setSelectedResident(e.target.value === "all" ? "all" : Number(e.target.value))
              }
            >
              <option value="all">All residents</option>
              {(residents ?? []).map((r) => (
                <option key={r.residentId} value={r.residentId}>
                  {displayName(r)}
                </option>
              ))}
            </select>
            <span className="text-sm text-muted-foreground ml-auto">
              {visits?.length ?? 0} visit{(visits?.length ?? 0) === 1 ? "" : "s"}
            </span>
          </CardContent>
        </Card>

        {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <div>
            <h3 className="font-semibold mb-3 text-sm uppercase text-muted-foreground">
              Upcoming case conferences & visits
            </h3>
            <div className="space-y-3">
              {upcoming.map((v) => (
                <VisitCard
                  key={v.visitationId}
                  v={v}
                  res={residentLookup.get(v.residentId)}
                  onEdit={() => openEdit(v)}
                  onEditable={v.canModify}
                  onDelete={v.canModify ? () => setDeleteTarget(v) : undefined}
                />
              ))}
            </div>
          </div>
        )}

        {/* History */}
        <div>
          <h3 className="font-semibold mb-3 text-sm uppercase text-muted-foreground">
            Visit history
          </h3>
          {history.length === 0 && !isLoading && (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No visits logged yet. Click “Log Visit” to record a home visitation.
              </CardContent>
            </Card>
          )}
          <div className="space-y-3">
            {history.map((v) => (
              <VisitCard
                key={v.visitationId}
                v={v}
                res={residentLookup.get(v.residentId)}
                onEdit={() => openEdit(v)}
                onEditable={v.canModify}
                onDelete={v.canModify ? () => setDeleteTarget(v) : undefined}
              />
            ))}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
        title="Delete this home visit?"
        description="This will permanently remove the visit record. This action cannot be undone."
        confirmLabel="Delete"
        loading={deleteMut.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMut.mutate(deleteTarget.visitationId);
        }}
      />
    </DashboardLayout>
  );
};

interface VisitCardProps {
  v: HomeVisitationRow;
  res?: ResidentRow;
  onEdit: () => void;
  // Whether the Edit button should render (rows the caller didn't create
  // are read-only for staff).
  onEditable?: boolean;
  onDelete?: () => void;
}

const VisitCard = ({ v, res, onEdit, onEditable = true, onDelete }: VisitCardProps) => (
  <Card>
    <CardContent className="p-5 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 font-semibold">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          {fmtDate(v.visitDate)}
        </div>
        <Badge variant="outline">{v.visitType ?? "Visit"}</Badge>
        {res && <Badge variant="secondary">{displayName(res)}</Badge>}
        {v.familyCooperationLevel && (
          <Badge
            className={
              cooperationColor[v.familyCooperationLevel.toLowerCase()] ??
              "bg-muted text-muted-foreground"
            }
          >
            {v.familyCooperationLevel} cooperation
          </Badge>
        )}
        {v.safetyConcernsNoted && (
          <Badge className="bg-primary/10 text-primary border-primary/20">
            <AlertTriangle className="w-3 h-3 mr-1" /> Safety concerns
          </Badge>
        )}
        <span className="ml-auto text-xs text-muted-foreground">{v.socialWorker ?? "—"}</span>
        {/* Edit/Delete are gated by the backend's per-row `canModify` flag
            (forwarded as `onEditable` + whether `onDelete` was passed).
            Admins can modify anything in their scope; Staff can only
            modify rows they personally created. */}
        {(onEditable || onDelete) && (
          <div className="flex items-center gap-1">
            {onEditable && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onEdit}
                aria-label="Edit visit"
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={onDelete}
                aria-label="Delete visit"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>
      {v.locationVisited && (
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <MapPin className="w-3 h-3" /> {v.locationVisited}
        </p>
      )}
      {v.purpose && (
        <p className="text-sm">
          <b>Purpose:</b> {v.purpose}
        </p>
      )}
      {v.observations && <p className="text-sm whitespace-pre-wrap">{v.observations}</p>}
      {v.followUpNeeded && v.followUpNotes && (
        <p className="text-sm">
          <b>Follow-up:</b> {v.followUpNotes}
        </p>
      )}
      {v.visitOutcome && (
        <p className="text-sm">
          <b>Outcome:</b> {v.visitOutcome}
        </p>
      )}
    </CardContent>
  </Card>
);

export default HomeVisitation;
