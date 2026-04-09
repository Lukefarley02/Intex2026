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
import { Plus, ClipboardList, Heart, AlertTriangle, Calendar, Pencil, Trash2 } from "lucide-react";
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
}

const displayName = (r: ResidentRow) =>
  r.internalCode || r.caseControlNo || `Resident #${r.residentId}`;

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";

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
  const { hasRole } = useAuth();
  const isAdmin = hasRole("Admin");
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
    queryKey: ["process-recordings", selectedResident],
    queryFn: () =>
      apiFetch<ProcessRecordingRow[]>(
        selectedResident === "all"
          ? "/api/processrecordings"
          : `/api/processrecordings?residentId=${selectedResident}`,
      ),
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

  return (
    <DashboardLayout title="Process Recording">
      <div className="max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-primary" /> Counseling Session Notes
            </h2>
            <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
              Document the healing journey for each resident. Each entry captures session
              date, emotional state, narrative, interventions, and follow-up actions.
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

        {/* Resident filter */}
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
              {recordings?.length ?? 0} recording{(recordings?.length ?? 0) === 1 ? "" : "s"}
            </span>
          </CardContent>
        </Card>

        {/* Recording list */}
        {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}
        {!isLoading && (recordings?.length ?? 0) === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No process recordings yet. Click “New Recording” to document a session.
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {(recordings ?? []).map((p) => {
            const res = residentLookup.get(p.residentId);
            return (
              <Card key={p.recordingId}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 font-semibold">
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
                    <span className="ml-auto text-xs text-muted-foreground">
                      {p.socialWorker ?? "—"}
                    </span>
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
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(p)}
                          aria-label="Delete recording"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {(p.emotionalStateObserved || p.emotionalStateEnd) && (
                    <p className="text-sm text-muted-foreground">
                      Emotional state: <b>{p.emotionalStateObserved ?? "—"}</b>
                      {" → "}
                      <b>{p.emotionalStateEnd ?? "—"}</b>
                    </p>
                  )}
                  {p.sessionNarrative && (
                    <p className="text-sm whitespace-pre-wrap">{p.sessionNarrative}</p>
                  )}
                  {p.interventionsApplied && (
                    <p className="text-sm">
                      <b>Interventions:</b> {p.interventionsApplied}
                    </p>
                  )}
                  {p.followUpActions && (
                    <p className="text-sm">
                      <b>Follow-up:</b> {p.followUpActions}
                    </p>
                  )}
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
