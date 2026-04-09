import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ClipboardList,
  MapPin,
  Calendar,
  Heart,
  AlertTriangle,
  Home as HomeIcon,
  Pencil,
  Trash2,
  FileText,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/api/client";
import { toast } from "@/hooks/use-toast";
import ConfirmDialog from "@/components/ConfirmDialog";

// ---- Shared types (same shape as ProcessRecording.tsx / HomeVisitation.tsx) ----
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
  canModify: boolean;
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

const cooperationColor: Record<string, string> = {
  high: "bg-success/10 text-success border-success/20",
  medium: "bg-gold/10 text-gold border-gold/20",
  low: "bg-primary/10 text-primary border-primary/20",
  none: "bg-muted text-muted-foreground",
};

const MyReports = () => {
  const qc = useQueryClient();
  const [deleteRecording, setDeleteRecording] = useState<ProcessRecordingRow | null>(null);
  const [deleteVisit, setDeleteVisit] = useState<HomeVisitationRow | null>(null);

  // Fetch this user's reports from the dedicated my-reports endpoints
  const { data: recordings, isLoading: loadingRec } = useQuery<ProcessRecordingRow[]>({
    queryKey: ["my-reports", "process-recordings"],
    queryFn: () => apiFetch<ProcessRecordingRow[]>("/api/myreports/process-recordings"),
  });

  const { data: visits, isLoading: loadingVis } = useQuery<HomeVisitationRow[]>({
    queryKey: ["my-reports", "home-visitations"],
    queryFn: () => apiFetch<HomeVisitationRow[]>("/api/myreports/home-visitations"),
  });

  const { data: residents } = useQuery<ResidentRow[]>({
    queryKey: ["residents"],
    queryFn: () => apiFetch<ResidentRow[]>("/api/residents"),
  });

  const residentLookup = useMemo(() => {
    const m = new Map<number, ResidentRow>();
    (residents ?? []).forEach((r) => m.set(r.residentId, r));
    return m;
  }, [residents]);

  // Delete mutations — edit navigates to the full page
  const deleteRecMut = useMutation({
    mutationFn: (id: number) =>
      apiFetch<void>(`/api/processrecordings/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-reports"] });
      qc.invalidateQueries({ queryKey: ["process-recordings"] });
      toast({ title: "Recording deleted" });
      setDeleteRecording(null);
    },
    onError: (e: Error) => {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    },
  });

  const deleteVisMut = useMutation({
    mutationFn: (id: number) =>
      apiFetch<void>(`/api/homevisitations/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-reports"] });
      qc.invalidateQueries({ queryKey: ["home-visitations"] });
      toast({ title: "Visit deleted" });
      setDeleteVisit(null);
    },
    onError: (e: Error) => {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    },
  });

  return (
    <DashboardLayout title="My Reports">
      <div className="max-w-6xl space-y-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" /> My Reports
          </h2>
          <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
            A consolidated view of all process recordings and home visitations you have
            personally created.
          </p>
        </div>

        <Tabs defaultValue="recordings" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="recordings" className="gap-2">
              <ClipboardList className="w-4 h-4" />
              Sessions ({recordings?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger value="visits" className="gap-2">
              <HomeIcon className="w-4 h-4" />
              Visits ({visits?.length ?? 0})
            </TabsTrigger>
          </TabsList>

          {/* -------- Process Recordings tab -------- */}
          <TabsContent value="recordings" className="mt-4 space-y-4">
            {loadingRec && (
              <p className="text-muted-foreground text-sm">Loading…</p>
            )}
            {!loadingRec && (recordings?.length ?? 0) === 0 && (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  You haven't created any process recordings yet. Head to the{" "}
                  <a href="/process-recording" className="text-primary underline">
                    Process Recording
                  </a>{" "}
                  page to document a session.
                </CardContent>
              </Card>
            )}
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
                      {p.canModify && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              window.location.href = "/process-recording";
                            }}
                            aria-label="Edit recording"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteRecording(p)}
                            aria-label="Delete recording"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
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
          </TabsContent>

          {/* -------- Home Visitations tab -------- */}
          <TabsContent value="visits" className="mt-4 space-y-4">
            {loadingVis && (
              <p className="text-muted-foreground text-sm">Loading…</p>
            )}
            {!loadingVis && (visits?.length ?? 0) === 0 && (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  You haven't logged any home visitations yet. Head to the{" "}
                  <a href="/home-visitation" className="text-primary underline">
                    Home Visitation
                  </a>{" "}
                  page to log a visit.
                </CardContent>
              </Card>
            )}
            {(visits ?? []).map((v) => {
              const res = residentLookup.get(v.residentId);
              return (
                <Card key={v.visitationId}>
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
                      <span className="ml-auto text-xs text-muted-foreground">
                        {v.socialWorker ?? "—"}
                      </span>
                      {v.canModify && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              window.location.href = "/home-visitation";
                            }}
                            aria-label="Edit visit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteVisit(v)}
                            aria-label="Delete visit"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
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
                    {v.observations && (
                      <p className="text-sm whitespace-pre-wrap">{v.observations}</p>
                    )}
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
            })}
          </TabsContent>
        </Tabs>
      </div>

      {/* Confirm dialogs for delete */}
      <ConfirmDialog
        open={deleteRecording !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteRecording(null);
        }}
        title="Delete this process recording?"
        description="This will permanently remove the counseling session note. This action cannot be undone."
        confirmLabel="Delete"
        loading={deleteRecMut.isPending}
        onConfirm={() => {
          if (deleteRecording) deleteRecMut.mutate(deleteRecording.recordingId);
        }}
      />
      <ConfirmDialog
        open={deleteVisit !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteVisit(null);
        }}
        title="Delete this home visit?"
        description="This will permanently remove the visit record. This action cannot be undone."
        confirmLabel="Delete"
        loading={deleteVisMut.isPending}
        onConfirm={() => {
          if (deleteVisit) deleteVisMut.mutate(deleteVisit.visitationId);
        }}
      />
    </DashboardLayout>
  );
};

export default MyReports;
