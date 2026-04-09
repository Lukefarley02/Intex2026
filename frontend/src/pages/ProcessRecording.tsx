import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  ClipboardList,
  Heart,
  AlertTriangle,
  Calendar,
  Pencil,
  ChevronRight,
  Search,
  Trash2,
} from "lucide-react";
import { Plus, ClipboardList, Heart, AlertTriangle, Calendar, Pencil, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
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

interface ProcessRecordingRow {
  recordingId: number;
  residentId: number;
  sessionDate: string | null;
  sessionType: string | null;
  sessionDurationMinutes: number | null;
  emotionalStateObserved: string | null;
  emotionalStateEnd: string | null;
  sessionNarrative: string | null;
  interventionsApplied: string | null;
  progressNoted: boolean | null;
  concernsFlagged: boolean | null;
  referralMade: boolean | null;
  followUpActions: string | null;
  socialWorker: string | null;
  createdByUserId: string | null;
  // Server-computed: true if the current user is allowed to edit/delete.
  // Admins can always modify; Staff can only modify rows they created.
  canModify: boolean;
}

const displayName = (r: ResidentRow) =>
  r.internalCode || r.caseControlNo || `Resident #${r.residentId}`;

const fmtDate = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

interface FormState {
  recordingId: number; // 0 when creating
  residentId: number;
  sessionDate: string; // yyyy-mm-dd
  sessionType: string;
  sessionDurationMinutes: number;
  emotionalStateObserved: string;
  emotionalStateEnd: string;
  sessionNarrative: string;
  interventionsApplied: string;
  followUpActions: string;
  socialWorker: string;
  progressNoted: boolean;
  concernsFlagged: boolean;
  referralMade: boolean;
}

const emptyForm: FormState = {
  recordingId: 0,
  residentId: 0,
  sessionDate: new Date().toISOString().slice(0, 10),
  sessionType: "Individual",
  sessionDurationMinutes: 60,
  emotionalStateObserved: "",
  emotionalStateEnd: "",
  sessionNarrative: "",
  interventionsApplied: "",
  followUpActions: "",
  socialWorker: "",
  progressNoted: false,
  concernsFlagged: false,
  referralMade: false,
};

// ---- Detail row helper ----
function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-2 py-2">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className="text-sm">{value || <span className="text-muted-foreground/50">—</span>}</span>
    </div>
  );
}

// ---- Edit form inside detail dialog ----
type EditForm = {
  sessionType: string;
  sessionDurationMinutes: number;
  emotionalStateObserved: string;
  emotionalStateEnd: string;
  sessionNarrative: string;
  interventionsApplied: string;
  followUpActions: string;
  socialWorker: string;
  progressNoted: boolean;
  concernsFlagged: boolean;
  referralMade: boolean;
};

function toEditForm(p: ProcessRecordingRow): EditForm {
  return {
    sessionType: p.sessionType ?? "Individual",
    sessionDurationMinutes: p.sessionDurationMinutes ?? 60,
    emotionalStateObserved: p.emotionalStateObserved ?? "",
    emotionalStateEnd: p.emotionalStateEnd ?? "",
    sessionNarrative: p.sessionNarrative ?? "",
    interventionsApplied: p.interventionsApplied ?? "",
    followUpActions: p.followUpActions ?? "",
    socialWorker: p.socialWorker ?? "",
    progressNoted: p.progressNoted ?? false,
    concernsFlagged: p.concernsFlagged ?? false,
    referralMade: p.referralMade ?? false,
  };
}

// ---- Detail / Edit dialog ----
function RecordingDetailDialog({
  recording,
  resident,
  onSave,
  isSaving,
  onDelete,
  isDeleting,
}: {
  recording: ProcessRecordingRow;
  resident: ResidentRow | undefined;
  onSave: (id: number, form: EditForm) => void;
  isSaving: boolean;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditForm>(toEditForm(recording));
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleOpen = (v: boolean) => {
    setOpen(v);
    if (!v) {
      setEditing(false);
      setForm(toEditForm(recording));
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <button className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          Details <ChevronRight className="w-3 h-3" />
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            Session — {fmtDate(recording.sessionDate)}
          </DialogTitle>
        </DialogHeader>

        {!editing ? (
          /* ---- Read view ---- */
          <div className="space-y-1 py-1">
            <div className="divide-y">
              <DetailRow label="Resident" value={resident ? displayName(resident) : `#${recording.residentId}`} />
              <DetailRow label="Safehouse" value={resident?.safehouse?.name} />
              <DetailRow label="Session date" value={fmtDate(recording.sessionDate)} />
              <DetailRow label="Session type" value={recording.sessionType} />
              <DetailRow label="Duration" value={recording.sessionDurationMinutes ? `${recording.sessionDurationMinutes} min` : null} />
              <DetailRow label="Social worker" value={recording.socialWorker} />
            </div>

            <Separator className="my-3" />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pb-1">Emotional State</p>
            <div className="divide-y">
              <DetailRow label="At start" value={recording.emotionalStateObserved} />
              <DetailRow label="At end" value={recording.emotionalStateEnd} />
            </div>

            <Separator className="my-3" />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pb-1">Narrative Summary</p>
            <div className="divide-y">
              <DetailRow
                label="Session narrative"
                value={
                  recording.sessionNarrative ? (
                    <span className="whitespace-pre-wrap">{recording.sessionNarrative}</span>
                  ) : null
                }
              />
              <DetailRow label="Interventions applied" value={recording.interventionsApplied} />
              <DetailRow label="Follow-up actions" value={recording.followUpActions} />
            </div>

            <Separator className="my-3" />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pb-1">Flags</p>
            <div className="flex gap-3 pt-1">
              <Badge className={recording.progressNoted ? "bg-success/10 text-success border-success/20" : "opacity-30"}>
                <Heart className="w-3 h-3 mr-1" /> Progress noted
              </Badge>
              <Badge className={recording.concernsFlagged ? "bg-primary/10 text-primary border-primary/20" : "opacity-30"}>
                <AlertTriangle className="w-3 h-3 mr-1" /> Concerns flagged
              </Badge>
              <Badge variant="outline" className={!recording.referralMade ? "opacity-30" : ""}>
                Referral made
              </Badge>
            </div>
          </div>
        ) : (
          /* ---- Edit view ---- */
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Session Type</Label>
                <select
                  className="w-full border rounded-md h-10 px-3 bg-background"
                  value={form.sessionType}
                  onChange={(e) => setForm({ ...form, sessionType: e.target.value })}
                >
                  <option>Individual</option>
                  <option>Group</option>
                  <option>Family</option>
                </select>
              </div>
              <div>
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.sessionDurationMinutes}
                  onChange={(e) => setForm({ ...form, sessionDurationMinutes: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <Label>Social worker</Label>
              <Input
                value={form.socialWorker}
                onChange={(e) => setForm({ ...form, socialWorker: e.target.value })}
              />
            </div>

            <Separator />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Emotional State</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>At start</Label>
                <Input
                  value={form.emotionalStateObserved}
                  onChange={(e) => setForm({ ...form, emotionalStateObserved: e.target.value })}
                  placeholder="e.g. Withdrawn"
                />
              </div>
              <div>
                <Label>At end</Label>
                <Input
                  value={form.emotionalStateEnd}
                  onChange={(e) => setForm({ ...form, emotionalStateEnd: e.target.value })}
                  placeholder="e.g. Hopeful"
                />
              </div>
            </div>

            <Separator />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Narrative Summary</p>
            <div>
              <Label>Session narrative</Label>
              <Textarea
                rows={4}
                value={form.sessionNarrative}
                onChange={(e) => setForm({ ...form, sessionNarrative: e.target.value })}
                placeholder="Summary of what happened in the session…"
              />
            </div>
            <div>
              <Label>Interventions applied</Label>
              <Textarea
                rows={2}
                value={form.interventionsApplied}
                onChange={(e) => setForm({ ...form, interventionsApplied: e.target.value })}
              />
            </div>
            <div>
              <Label>Follow-up actions</Label>
              <Textarea
                rows={2}
                value={form.followUpActions}
                onChange={(e) => setForm({ ...form, followUpActions: e.target.value })}
              />
            </div>

            <Separator />
            <div className="flex items-center gap-6 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.progressNoted}
                  onChange={(e) => setForm({ ...form, progressNoted: e.target.checked })}
                />
                Progress noted
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.concernsFlagged}
                  onChange={(e) => setForm({ ...form, concernsFlagged: e.target.checked })}
                />
                Concerns flagged
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.referralMade}
                  onChange={(e) => setForm({ ...form, referralMade: e.target.checked })}
                />
                Referral made
              </label>
            </div>
          </div>
        )}

        <DialogFooter className="pt-2 flex-col sm:flex-row gap-2">
          {!editing ? (
            <>
              <Button
                variant="destructive"
                size="sm"
                className="gap-1 mr-auto"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="w-4 h-4" /> Delete
              </Button>
              <Button variant="outline" onClick={() => handleOpen(false)}>Close</Button>
              <Button className="gap-2" onClick={() => setEditing(true)}>
                <Pencil className="w-4 h-4" /> Edit
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => { setEditing(false); setForm(toEditForm(recording)); }}>
                Cancel
              </Button>
              <Button
                disabled={isSaving}
                onClick={() => {
                  onSave(recording.recordingId, form);
                  setEditing(false);
                  setOpen(false);
                }}
              >
                {isSaving ? "Saving…" : "Save changes"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ConfirmDialog
      open={confirmDelete}
      onOpenChange={setConfirmDelete}
      title="Delete this recording?"
      description="This will permanently remove the session record. This action cannot be undone."
      confirmLabel="Delete"
      destructive
      loading={isDeleting}
      onConfirm={() => {
        onDelete(recording.recordingId);
        setConfirmDelete(false);
        setOpen(false);
      }}
    />
    </>
  );
}

// ---- Main page ----
const ProcessRecording = () => {
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const urlResidentId = searchParams.get("residentId") ? Number(searchParams.get("residentId")) : null;

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [sessionTypeFilter, setSessionTypeFilter] = useState("__any__");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
const toFormState = (p: ProcessRecordingRow): FormState => ({
  recordingId: p.recordingId,
  residentId: p.residentId,
  sessionDate: p.sessionDate ? p.sessionDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
  sessionType: p.sessionType ?? "Individual",
  sessionDurationMinutes: p.sessionDurationMinutes ?? 60,
  emotionalStateObserved: p.emotionalStateObserved ?? "",
  emotionalStateEnd: p.emotionalStateEnd ?? "",
  sessionNarrative: p.sessionNarrative ?? "",
  interventionsApplied: p.interventionsApplied ?? "",
  followUpActions: p.followUpActions ?? "",
  socialWorker: p.socialWorker ?? "",
  progressNoted: !!p.progressNoted,
  concernsFlagged: !!p.concernsFlagged,
  referralMade: !!p.referralMade,
});

const ProcessRecording = () => {
  const qc = useQueryClient();
  // `useAuth` is still imported in case a future change needs the caller's
  // role, but per-row edit/delete visibility is driven by the server's
  // `canModify` flag so we no longer need an `isAdmin` derivation here.
  useAuth();
  const [selectedResident, setSelectedResident] = useState<number | "all">("all");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<ProcessRecordingRow | null>(null);

  const { data: residents } = useQuery<ResidentRow[]>({
    queryKey: ["residents"],
    queryFn: () => apiFetch<ResidentRow[]>("/api/residents"),
  });

  const { data: recordings, isLoading } = useQuery<ProcessRecordingRow[]>({
    queryKey: ["process-recordings"],
    queryFn: () => apiFetch<ProcessRecordingRow[]>("/api/processrecordings"),
  });

  const buildPayload = (f: FormState) => ({
    recordingId: f.recordingId,
    residentId: f.residentId,
    sessionDate: new Date(f.sessionDate).toISOString(),
    sessionType: f.sessionType,
    sessionDurationMinutes: f.sessionDurationMinutes,
    emotionalStateObserved: f.emotionalStateObserved,
    emotionalStateEnd: f.emotionalStateEnd,
    sessionNarrative: f.sessionNarrative,
    interventionsApplied: f.interventionsApplied,
    progressNoted: f.progressNoted,
    concernsFlagged: f.concernsFlagged,
    referralMade: f.referralMade,
    followUpActions: f.followUpActions,
    socialWorker: f.socialWorker,
    notesRestricted: null,
  });

  const saveMut = useMutation({
    mutationFn: async (f: FormState) => {
      if (f.recordingId === 0) {
        return apiFetch<ProcessRecordingRow>("/api/processrecordings", {
          method: "POST",
          body: JSON.stringify(buildPayload(f)),
        });
      }
      // PUT returns 204 No Content — apiFetch handles an empty body.
      await apiFetch<void>(`/api/processrecordings/${f.recordingId}`, {
        method: "PUT",
        body: JSON.stringify(buildPayload(f)),
      });
      return null;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["process-recordings"] });
      toast({
        title: editingId ? "Recording updated" : "Session recorded",
        description: "Process recording saved successfully.",
      });
      setOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: (e: Error) => {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, form }: { id: number; form: EditForm }) =>
      apiFetch<ProcessRecordingRow>(`/api/processrecordings/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          recordingId: id,
          sessionType: form.sessionType,
          sessionDurationMinutes: form.sessionDurationMinutes,
          emotionalStateObserved: form.emotionalStateObserved,
          emotionalStateEnd: form.emotionalStateEnd,
          sessionNarrative: form.sessionNarrative,
          interventionsApplied: form.interventionsApplied,
          progressNoted: form.progressNoted,
          concernsFlagged: form.concernsFlagged,
          referralMade: form.referralMade,
          followUpActions: form.followUpActions,
          socialWorker: form.socialWorker,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["process-recordings"] });
      toast({ title: "Recording updated", description: "Changes saved successfully." });
    },
    onError: (e: Error) => {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/processrecordings/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["process-recordings"] });
      toast({ title: "Recording deleted", description: "The session record has been removed." });
  const deleteMut = useMutation({
    mutationFn: (id: number) =>
      apiFetch<void>(`/api/processrecordings/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["process-recordings"] });
      toast({ title: "Recording deleted" });
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

  const openEdit = (p: ProcessRecordingRow) => {
    setEditingId(p.recordingId);
    setForm(toFormState(p));
    setOpen(true);
  };

  const residentLookup = useMemo(() => {
    const m = new Map<number, ResidentRow>();
    (residents ?? []).forEach((r) => m.set(r.residentId, r));
    return m;
  }, [residents]);

  const filteredRecordings = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (recordings ?? []).filter((p) => {
      if (urlResidentId !== null && p.residentId !== urlResidentId) return false;
      if (sessionTypeFilter !== "__any__" && (p.sessionType ?? "") !== sessionTypeFilter) return false;
      if (q) {
        const res = residentLookup.get(p.residentId);
        const haystack = [
          res ? displayName(res) : "",
          res?.safehouse?.name ?? "",
          p.socialWorker ?? "",
        ].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (dateFrom && p.sessionDate && new Date(p.sessionDate) < new Date(dateFrom)) return false;
      if (dateTo && p.sessionDate && new Date(p.sessionDate) > new Date(dateTo + "T23:59:59")) return false;
      return true;
    });
  }, [recordings, residentLookup, search, sessionTypeFilter, dateFrom, dateTo, urlResidentId]);

  const hasFilters = sessionTypeFilter !== "__any__" || dateFrom !== "" || dateTo !== "";
  const clearFilters = () => { setSessionTypeFilter("__any__"); setDateFrom(""); setDateTo(""); };

  const urlResidentName = urlResidentId !== null
    ? (() => { const r = residentLookup.get(urlResidentId); return r ? displayName(r) : `Resident #${urlResidentId}`; })()
    : null;

  return (
    <DashboardLayout title="Process Recording">
      <div className="max-w-6xl space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" /> Counseling Session Notes
          </h2>
          <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
            Document the healing journey for each resident. Each entry captures session
            date, emotional state, narrative, interventions, and follow-up actions.
          </p>
        </div>

        {/* Resident scope banner */}
        {urlResidentName && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
            <span>Showing recordings for</span>
            <Badge variant="secondary">{urlResidentName}</Badge>
          </div>
        )}

        {/* Top bar: search + action */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search safehouse, resident, social worker…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
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
              <Button size="sm" className="gap-2">
              <Button className="gap-2" onClick={openCreate}>
                <Plus className="w-4 h-4" /> New Recording
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Edit Process Recording" : "New Process Recording"}
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
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Session Date</Label>
                    <Input
                      type="date"
                      value={form.sessionDate}
                      onChange={(e) => setForm({ ...form, sessionDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Session Type</Label>
                    <select
                      className="w-full border rounded-md h-10 px-3 bg-background"
                      value={form.sessionType}
                      onChange={(e) => setForm({ ...form, sessionType: e.target.value })}
                    >
                      <option>Individual</option>
                      <option>Group</option>
                      <option>Family</option>
                    </select>
                  </div>
                  <div>
                    <Label>Duration (min)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={form.sessionDurationMinutes}
                      onChange={(e) =>
                        setForm({ ...form, sessionDurationMinutes: Number(e.target.value) })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Emotional state at start</Label>
                    <Input
                      value={form.emotionalStateObserved}
                      onChange={(e) => setForm({ ...form, emotionalStateObserved: e.target.value })}
                      placeholder="e.g. Withdrawn"
                    />
                  </div>
                  <div>
                    <Label>Emotional state at end</Label>
                    <Input
                      value={form.emotionalStateEnd}
                      onChange={(e) => setForm({ ...form, emotionalStateEnd: e.target.value })}
                      placeholder="e.g. Hopeful"
                    />
                  </div>
                </div>
                <div>
                  <Label>Session narrative</Label>
                  <Textarea
                    rows={4}
                    value={form.sessionNarrative}
                    onChange={(e) => setForm({ ...form, sessionNarrative: e.target.value })}
                    placeholder="Summary of what happened in the session…"
                  />
                </div>
                <div>
                  <Label>Interventions applied</Label>
                  <Textarea
                    rows={2}
                    value={form.interventionsApplied}
                    onChange={(e) => setForm({ ...form, interventionsApplied: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Follow-up actions</Label>
                  <Textarea
                    rows={2}
                    value={form.followUpActions}
                    onChange={(e) => setForm({ ...form, followUpActions: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Social worker</Label>
                    <Input
                      value={form.socialWorker}
                      onChange={(e) => setForm({ ...form, socialWorker: e.target.value })}
                    />
                  </div>
                  <div className="flex items-end gap-4 pb-2 text-sm">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={form.progressNoted}
                        onChange={(e) => setForm({ ...form, progressNoted: e.target.checked })}
                      />
                      Progress
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={form.concernsFlagged}
                        onChange={(e) => setForm({ ...form, concernsFlagged: e.target.checked })}
                      />
                      Concerns
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={form.referralMade}
                        onChange={(e) => setForm({ ...form, referralMade: e.target.checked })}
                      />
                      Referral
                    </label>
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
                      : "Save Recording"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-medium">Session type</label>
            <Select value={sessionTypeFilter} onValueChange={setSessionTypeFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Any type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__any__">Any type</SelectItem>
                <SelectItem value="Individual">Individual</SelectItem>
                <SelectItem value="Group">Group</SelectItem>
                <SelectItem value="Family">Family</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-medium">From</label>
            <Input
              type="date"
              className="h-9 text-sm w-40"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-medium">To</label>
            <Input
              type="date"
              className="h-9 text-sm w-40"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          {hasFilters && (
            <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>

        {/* Recording list */}
        {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}
        {!isLoading && (recordings?.length ?? 0) === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No process recordings yet. Click "New Recording" to document a session.
            </CardContent>
          </Card>
        )}
        {!isLoading && (recordings?.length ?? 0) > 0 && filteredRecordings.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No recordings match your search or date filter.
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {filteredRecordings.map((p) => {
            const res = residentLookup.get(p.residentId);
            return (
              <Card key={p.recordingId}>
                <CardContent className="p-4 space-y-2">
                  {/* Badge row */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 font-semibold text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      {fmtDate(p.sessionDate)}
                    </div>
                    <Badge variant="outline">{p.sessionType ?? "Session"}</Badge>
                    {p.sessionDurationMinutes && (
                      <Badge variant="outline">{p.sessionDurationMinutes} min</Badge>
                    )}
                    {res && <Badge variant="secondary">{displayName(res)}</Badge>}
                    {p.progressNoted && (
                      <Badge className="bg-success/10 text-success border-success/20">
                        <Heart className="w-3 h-3 mr-1" /> Progress
                      </Badge>
                    )}
                    {p.concernsFlagged && (
                      <Badge className="bg-primary/10 text-primary border-primary/20">
                        <AlertTriangle className="w-3 h-3 mr-1" /> Concerns
                      </Badge>
                    )}
                    {p.referralMade && (
                      <Badge variant="outline">Referral</Badge>
                    )}
                    <RecordingDetailDialog
                      recording={p}
                      resident={res}
                      onSave={(id, editForm) => updateMut.mutate({ id, form: editForm })}
                      isSaving={updateMut.isPending}
                      onDelete={(id) => deleteMut.mutate(id)}
                      isDeleting={deleteMut.isPending}
                    />
                  </div>

                  {/* General info row */}
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-muted-foreground">
                    {(p.emotionalStateObserved || p.emotionalStateEnd) && (
                      <span>
                        Mood: <span className="text-foreground font-medium">{p.emotionalStateObserved ?? "—"}</span>
                        {" → "}
                        <span className="text-foreground font-medium">{p.emotionalStateEnd ?? "—"}</span>
                      </span>
                    )}
                    {p.socialWorker && (
                      <span>
                        Worker: <span className="text-foreground font-medium">{p.socialWorker}</span>
                      </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {p.socialWorker ?? "—"}
                    </span>
                    {/* Edit and delete are gated on `canModify` which the
                        backend stamps per-row: admins can always modify,
                        staff can only modify rows they personally created.
                        Legacy rows with no owner fall through to admin-only. */}
                    {p.canModify && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(p)}
                          aria-label="Edit recording"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(p)}
                          aria-label="Delete recording"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
        title="Delete this process recording?"
        description="This will permanently remove the counseling session note. This action cannot be undone."
        confirmLabel="Delete"
        loading={deleteMut.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMut.mutate(deleteTarget.recordingId);
        }}
      />
    </DashboardLayout>
  );
};

export default ProcessRecording;
