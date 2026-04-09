import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Plus,
  ClipboardList,
  Heart,
  AlertTriangle,
  Calendar,
  Pencil,
  Trash2,
  Search,
} from "lucide-react";
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
  createdByUserId: string | null;
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
  recordingId: number;
  residentId: number;
  sessionDate: string;
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

// ---- Detail row helper ----
function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-2 py-2">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className="text-sm">
        {value ?? <span className="text-muted-foreground/40">—</span>}
      </span>
    </div>
  );
}

// ---- Main page ----
const ProcessRecording = () => {
  const qc = useQueryClient();
  useAuth();

  const [searchParams] = useSearchParams();
  const initialResident = searchParams.get("residentId");
  const [selectedResident, setSelectedResident] = useState<number | "all">(
    initialResident ? Number(initialResident) : "all",
  );

  // Create / edit dialog
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  // Detail sheet
  const [selected, setSelected] = useState<ProcessRecordingRow | null>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<ProcessRecordingRow | null>(null);

  // Client-side filters
  const [search, setSearch] = useState("");
  const [sessionTypeFilter, setSessionTypeFilter] = useState("__any__");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

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
      setSelected(null);
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
    setSelected(null);
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
      if (sessionTypeFilter !== "__any__" && (p.sessionType ?? "") !== sessionTypeFilter)
        return false;
      if (q) {
        const res = residentLookup.get(p.residentId);
        const haystack = [
          res ? displayName(res) : "",
          res?.safehouse?.name ?? "",
          p.socialWorker ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (dateFrom && p.sessionDate && new Date(p.sessionDate) < new Date(dateFrom))
        return false;
      if (dateTo && p.sessionDate && new Date(p.sessionDate) > new Date(dateTo + "T23:59:59"))
        return false;
      return true;
    });
  }, [recordings, residentLookup, search, sessionTypeFilter, dateFrom, dateTo]);

  const hasFilters = sessionTypeFilter !== "__any__" || dateFrom !== "" || dateTo !== "";
  const clearFilters = () => {
    setSessionTypeFilter("__any__");
    setDateFrom("");
    setDateTo("");
  };

  const scopedResidentName =
    selectedResident !== "all"
      ? (() => {
          const r = residentLookup.get(selectedResident as number);
          return r ? displayName(r) : `Resident #${selectedResident}`;
        })()
      : null;

  const detailResident = selected ? residentLookup.get(selected.residentId) : undefined;
  const sheetOpen = selected !== null;

  return (
    <DashboardLayout title="Process Recording">
      <div className="max-w-6xl space-y-6">

        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" /> Counseling Session Notes
          </h2>
          <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
            Document the healing journey for each resident. Click any record to view full details.
          </p>
        </div>

        {/* Resident scope banner */}
        {scopedResidentName && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
            <span>Showing recordings for</span>
            <Badge variant="secondary">{scopedResidentName}</Badge>
            <button
              className="ml-auto text-xs hover:text-foreground transition-colors"
              onClick={() => setSelectedResident("all")}
            >
              Show all
            </button>
          </div>
        )}

        {/* Top bar: search + new button */}
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
              if (!o) { setEditingId(null); setForm(emptyForm); }
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2" onClick={openCreate}>
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
                      <input type="checkbox" checked={form.progressNoted}
                        onChange={(e) => setForm({ ...form, progressNoted: e.target.checked })} />
                      Progress
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={form.concernsFlagged}
                        onChange={(e) => setForm({ ...form, concernsFlagged: e.target.checked })} />
                      Concerns
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={form.referralMade}
                        onChange={(e) => setForm({ ...form, referralMade: e.target.checked })} />
                      Referral
                    </label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => saveMut.mutate(form)}
                  disabled={!form.residentId || saveMut.isPending}
                >
                  {saveMut.isPending ? "Saving…" : editingId ? "Save Changes" : "Save Recording"}
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
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-medium">From</label>
            <Input type="date" className="h-9 text-sm w-40" value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-medium">To</label>
            <Input type="date" className="h-9 text-sm w-40" value={dateTo}
              onChange={(e) => setDateTo(e.target.value)} />
          </div>
          {hasFilters && (
            <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
          <span className="text-xs text-muted-foreground ml-auto self-end pb-1">
            {filteredRecordings.length} of {recordings?.length ?? 0} recording
            {(recordings?.length ?? 0) === 1 ? "" : "s"}
          </span>
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
              No recordings match the current filters.
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {filteredRecordings.map((p) => {
            const res = residentLookup.get(p.residentId);
            return (
              <button
                key={p.recordingId}
                type="button"
                className="w-full text-left"
                onClick={() => setSelected(p)}
              >
                <Card className="hover:shadow-md transition-shadow">
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
                      {p.referralMade && <Badge variant="outline">Referral</Badge>}
                    </div>

                    {/* Info row: mood + social worker */}
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-muted-foreground">
                      {(p.emotionalStateObserved || p.emotionalStateEnd) && (
                        <span>
                          Mood:{" "}
                          <span className="text-foreground font-medium">
                            {p.emotionalStateObserved ?? "—"}
                          </span>
                          {" → "}
                          <span className="text-foreground font-medium">
                            {p.emotionalStateEnd ?? "—"}
                          </span>
                        </span>
                      )}
                      {p.socialWorker && (
                        <span>
                          Worker:{" "}
                          <span className="text-foreground font-medium">{p.socialWorker}</span>
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Detail sheet ── */}
      <Sheet open={sheetOpen} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-primary" />
                  Session — {fmtDate(selected.sessionDate)}
                </SheetTitle>
              </SheetHeader>

              {/* Action buttons */}
              {selected.canModify && (
                <div className="flex gap-2 mb-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEdit(selected)}
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive border-destructive/40 hover:bg-destructive/10"
                    onClick={() => setDeleteTarget(selected)}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                  </Button>
                </div>
              )}

              <Separator className="mb-4" />

              {/* Session info */}
              <div className="divide-y">
                <DetailRow
                  label="Resident"
                  value={
                    detailResident
                      ? displayName(detailResident)
                      : `#${selected.residentId}`
                  }
                />
                <DetailRow label="Safehouse" value={detailResident?.safehouse?.name} />
                <DetailRow label="Session date" value={fmtDate(selected.sessionDate)} />
                <DetailRow label="Session type" value={selected.sessionType} />
                <DetailRow
                  label="Duration"
                  value={
                    selected.sessionDurationMinutes
                      ? `${selected.sessionDurationMinutes} min`
                      : null
                  }
                />
                <DetailRow label="Social worker" value={selected.socialWorker} />
              </div>

              {/* Emotional state */}
              <Separator className="my-4" />
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Emotional State
              </p>
              <div className="divide-y">
                <DetailRow label="At start" value={selected.emotionalStateObserved} />
                <DetailRow label="At end" value={selected.emotionalStateEnd} />
              </div>

              {/* Narrative summary */}
              <Separator className="my-4" />
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Narrative Summary
              </p>
              <div className="divide-y">
                <DetailRow
                  label="Session narrative"
                  value={
                    selected.sessionNarrative ? (
                      <span className="whitespace-pre-wrap">{selected.sessionNarrative}</span>
                    ) : null
                  }
                />
                <DetailRow label="Interventions applied" value={selected.interventionsApplied} />
                <DetailRow label="Follow-up actions" value={selected.followUpActions} />
              </div>

              {/* Flags */}
              <Separator className="my-4" />
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Flags
              </p>
              <div className="flex flex-wrap gap-3">
                <Badge
                  className={
                    selected.progressNoted
                      ? "bg-success/10 text-success border-success/20"
                      : "opacity-30"
                  }
                >
                  <Heart className="w-3 h-3 mr-1" /> Progress noted
                </Badge>
                <Badge
                  className={
                    selected.concernsFlagged
                      ? "bg-primary/10 text-primary border-primary/20"
                      : "opacity-30"
                  }
                >
                  <AlertTriangle className="w-3 h-3 mr-1" /> Concerns flagged
                </Badge>
                <Badge variant="outline" className={!selected.referralMade ? "opacity-30" : ""}>
                  Referral made
                </Badge>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        title="Delete this process recording?"
        description="This will permanently remove the counseling session note. This action cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={deleteMut.isPending}
        onConfirm={() => { if (deleteTarget) deleteMut.mutate(deleteTarget.recordingId); }}
      />
    </DashboardLayout>
  );
};

export default ProcessRecording;
