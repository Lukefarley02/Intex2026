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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  MapPin,
  AlertTriangle,
  Calendar,
  Home as HomeIcon,
  Users,
  ClipboardList,
  CheckSquare,
  User,
  ChevronRight,
  Pencil,
  Building2,
  X,
  ShieldAlert,
  Camera,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/api/client";
import { toast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

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
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VISIT_TYPES = [
  "Initial assessment",
  "Routine follow-up",
  "Reintegration assessment",
  "Post-placement monitoring",
  "Emergency",
  "Case conference",
];

const COOPERATION_LEVELS = ["High", "Medium", "Low", "None"];

const PURPOSE_OPTIONS = [
  "Initial home assessment",
  "Safety monitoring visit",
  "Family counseling session",
  "Reintegration planning",
  "Post-placement monitoring",
  "Emergency welfare check",
  "Documentation and record update",
  "Community resource linkage",
  "Case conference preparation",
];

const LOCATION_OPTIONS = [
  "Family home",
  "Extended family home",
  "Foster / guardian home",
  "Community center",
  "School campus",
  "Hospital / medical facility",
  "Government office",
  "Other location",
];

const RELATIONSHIP_OPTIONS = [
  "Mother",
  "Father",
  "Grandmother",
  "Grandfather",
  "Aunt",
  "Uncle",
  "Sibling",
  "Guardian",
  "Step-parent",
  "Neighbor",
  "Social worker",
  "Other",
];

const OUTCOME_OPTIONS = [
  "Successful — all objectives met",
  "Partial success — some objectives met",
  "No contact — family absent",
  "Concerns identified — follow-up required",
  "Case escalated to supervisor",
  "Referred to additional services",
  "Emergency intervention initiated",
];

const HOME_ENV_OPTIONS = [
  "Safe and stable",
  "Adequate — minor improvements needed",
  "Overcrowded living space",
  "Poor sanitary conditions",
  "Signs of neglect",
  "Signs of abuse",
  "Unsafe neighborhood",
  "No fixed address / unstable housing",
  "Other",
];

const SAFETY_CONCERN_OPTIONS = [
  "None observed",
  "Minor concerns",
  "Moderate concerns",
  "Serious concerns — action required",
  "Immediate danger",
];

const isConference = (v: HomeVisitationRow) =>
  !!(v.visitType?.toLowerCase().includes("conference") || v.visitType?.toLowerCase().includes("review"));

const isUpcoming = (d: string | null) =>
  !!d && new Date(d).getTime() > Date.now();

const displayName = (r: ResidentRow) =>
  r.internalCode || r.caseControlNo || `Resident #${r.residentId}`;

const fmtDate = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
    : "—";

const cooperationColor: Record<string, string> = {
  high:   "bg-success/10 text-success border-success/20",
  medium: "bg-gold/10 text-gold border-gold/20",
  low:    "bg-primary/10 text-primary border-primary/20",
  none:   "bg-muted text-muted-foreground",
};

const emptyForm = {
  residentId: 0,
  visitDate: new Date().toISOString().slice(0, 10),
  visitType: "Routine follow-up",
  purpose: "Initial home assessment",
  locationVisited: "Family home",
  familyMemberName: "",              // combined with relationship → familyMembersPresent
  familyMemberRelationship: "Mother",
  familyCooperationLevel: "High",
  homeEnvironment: "Safe and stable",
  safetyConcernsLevel: "None observed",
  followUpNotes: "",
  visitOutcome: "Successful — all objectives met",
  socialWorker: "",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const HomeVisitation = () => {
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const preselectedId = Number(searchParams.get("residentId") ?? 0) || ("all" as const);

  const [selectedSafehouse, setSelectedSafehouse] = useState<string>("all");
  const [selectedResident, setSelectedResident] = useState<number | "all">(preselectedId);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<HomeVisitationRow | null>(null);

  // ── Data ──
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

  // ── Mutations ──
  const createMut = useMutation({
    mutationFn: (payload: typeof emptyForm) =>
      apiFetch<HomeVisitationRow>("/api/homevisitations", {
        method: "POST",
        body: JSON.stringify({
          visitationId: 0,
          residentId: payload.residentId,
          visitDate: new Date(payload.visitDate).toISOString(),
          visitType: payload.visitType,
          purpose: payload.purpose,
          locationVisited: payload.locationVisited,
          familyMembersPresent: payload.familyMemberName.trim()
            ? `${payload.familyMemberName.trim()} (${payload.familyMemberRelationship})`
            : "",
          familyCooperationLevel: payload.familyCooperationLevel,
          observations: payload.homeEnvironment,
          safetyConcernsNoted: payload.safetyConcernsLevel !== "None observed",
          followUpNeeded: payload.followUpNotes.trim().length > 0,
          followUpNotes: payload.followUpNotes,
          visitOutcome: payload.visitOutcome,
          socialWorker: payload.socialWorker,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["home-visitations"] });
      toast({ title: "Visit logged", description: "Home visitation saved successfully." });
      closeForm();
    },
    onError: (e: Error) => {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    },
  });

  const updateMut = useMutation({
    mutationFn: (payload: typeof emptyForm & { visitationId: number }) =>
      apiFetch<void>(`/api/homevisitations/${payload.visitationId}`, {
        method: "PUT",
        body: JSON.stringify({
          visitationId: payload.visitationId,
          residentId: payload.residentId,
          visitDate: new Date(payload.visitDate).toISOString(),
          visitType: payload.visitType,
          purpose: payload.purpose,
          locationVisited: payload.locationVisited,
          familyMembersPresent: payload.familyMemberName.trim()
            ? `${payload.familyMemberName.trim()} (${payload.familyMemberRelationship})`
            : "",
          familyCooperationLevel: payload.familyCooperationLevel,
          observations: payload.homeEnvironment,
          safetyConcernsNoted: payload.safetyConcernsLevel !== "None observed",
          followUpNeeded: payload.followUpNotes.trim().length > 0,
          followUpNotes: payload.followUpNotes,
          visitOutcome: payload.visitOutcome,
          socialWorker: payload.socialWorker,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["home-visitations"] });
      toast({ title: "Visit updated" });
      closeForm();
    },
    onError: (e: Error) => {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    },
  });

  // ── Derived state ──
  const residentLookup = useMemo(() => {
    const m = new Map<number, ResidentRow>();
    (residents ?? []).forEach((r) => m.set(r.residentId, r));
    return m;
  }, [residents]);

  const safehouseNames = useMemo(() => {
    const s = new Set<string>();
    (residents ?? []).forEach((r) => { if (r.safehouse?.name) s.add(r.safehouse.name); });
    return Array.from(s).sort();
  }, [residents]);

  const filteredResidents = useMemo(() =>
    selectedSafehouse === "all"
      ? (residents ?? [])
      : (residents ?? []).filter((r) => r.safehouse?.name === selectedSafehouse),
  [residents, selectedSafehouse]);

  // Apply safehouse filter to visits (client-side)
  const scopedVisits = useMemo(() => {
    if (selectedSafehouse === "all") return visits ?? [];
    return (visits ?? []).filter((v) => {
      const res = residentLookup.get(v.residentId);
      return res?.safehouse?.name === selectedSafehouse;
    });
  }, [visits, selectedSafehouse, residentLookup]);

  const upcoming = useMemo(
    () => [...scopedVisits.filter((v) => isUpcoming(v.visitDate))].sort(
      (a, b) => new Date(a.visitDate!).getTime() - new Date(b.visitDate!).getTime(),
    ),
    [scopedVisits],
  );

  const pastConferences = useMemo(
    () => scopedVisits.filter((v) => !isUpcoming(v.visitDate) && isConference(v)).sort(
      (a, b) => new Date(b.visitDate!).getTime() - new Date(a.visitDate!).getTime(),
    ),
    [scopedVisits],
  );

  const pastVisits = useMemo(
    () => scopedVisits.filter((v) => !isUpcoming(v.visitDate) && !isConference(v)).sort(
      (a, b) => new Date(b.visitDate!).getTime() - new Date(a.visitDate!).getTime(),
    ),
    [scopedVisits],
  );

  // ── Handlers ──
  const closeForm = () => {
    setCreateOpen(false);
    setIsEditing(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const openEdit = (v: HomeVisitationRow) => {
    // Map stored observations string back to the nearest dropdown option
    const storedEnv = v.observations ?? "";
    const matchedEnv = HOME_ENV_OPTIONS.find((o) => o === storedEnv) ?? (storedEnv || "Safe and stable");
    // Map stored boolean back to a safety level label
    const matchedSafety = v.safetyConcernsNoted ? "Minor concerns" : "None observed";
    // Parse "Name (Relationship)" back into two fields
    const stored = v.familyMembersPresent ?? "";
    const match = /^(.+)\s+\((.+)\)$/.exec(stored);
    const familyMemberName = match ? match[1] : stored;
    const familyMemberRelationship = match ? match[2] : "Mother";
    setForm({
      residentId: v.residentId,
      visitDate: v.visitDate ? new Date(v.visitDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      visitType: v.visitType ?? "Routine follow-up",
      purpose: v.purpose && PURPOSE_OPTIONS.includes(v.purpose) ? v.purpose : "Initial home assessment",
      locationVisited: v.locationVisited && LOCATION_OPTIONS.includes(v.locationVisited) ? v.locationVisited : "Family home",
      familyMemberName,
      familyMemberRelationship: RELATIONSHIP_OPTIONS.includes(familyMemberRelationship) ? familyMemberRelationship : "Other",
      familyCooperationLevel: v.familyCooperationLevel ?? "High",
      homeEnvironment: matchedEnv,
      safetyConcernsLevel: matchedSafety,
      followUpNotes: v.followUpNotes ?? "",
      visitOutcome: v.visitOutcome && OUTCOME_OPTIONS.includes(v.visitOutcome) ? v.visitOutcome : "Successful — all objectives met",
      socialWorker: v.socialWorker ?? "",
    });
    setEditingId(v.visitationId);
    setIsEditing(true);
    setDetailOpen(false);
    setCreateOpen(true);
  };

  const openDetail = (v: HomeVisitationRow) => {
    setSelected(v);
    setDetailOpen(true);
  };

  return (
    <DashboardLayout title="Home Visitation & Case Conferences">
      <div className="max-w-6xl space-y-6">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <HomeIcon className="w-6 h-6 text-primary" /> Home & Field Visits
            </h2>
            <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
              Log home visits, field assessments, and case conferences. Track home environment
              observations, family cooperation, safety concerns, and follow-up actions.
            </p>
          </div>
          <Button className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" /> Log Visit
          </Button>
        </div>

        {/* ── Filter panel ── */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Filters</p>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {scopedVisits.length} of {visits?.length ?? 0} visit{(visits?.length ?? 0) === 1 ? "" : "s"}
                </span>
                {(selectedSafehouse !== "all" || selectedResident !== "all") && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 gap-1 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => { setSelectedSafehouse("all"); setSelectedResident("all"); }}
                  >
                    <X className="w-3 h-3" /> Clear all
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> Safehouse
                </Label>
                <select
                  className="w-full border rounded-md h-9 px-3 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={selectedSafehouse}
                  onChange={(e) => { setSelectedSafehouse(e.target.value); setSelectedResident("all"); }}
                >
                  <option value="all">All safehouses</option>
                  {safehouseNames.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <User className="w-3 h-3" /> Resident
                </Label>
                <select
                  className="w-full border rounded-md h-9 px-3 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={selectedResident}
                  onChange={(e) =>
                    setSelectedResident(e.target.value === "all" ? "all" : Number(e.target.value))
                  }
                >
                  <option value="all">All residents</option>
                  {filteredResidents.map((r) => (
                    <option key={r.residentId} value={r.residentId}>
                      {displayName(r)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}

        {/* ── Upcoming visits & conferences ── */}
        {upcoming.length > 0 && (
          <section className="space-y-3">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Upcoming visits & case conferences
            </h3>
            {upcoming.map((v) => (
              <VisitCard
                key={v.visitationId}
                v={v}
                res={residentLookup.get(v.residentId)}
                onOpen={openDetail}
                onEdit={openEdit}
              />
            ))}
          </section>
        )}

        {/* ── Case conference history ── */}
        <section className="space-y-3">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <ClipboardList className="w-4 h-4" /> Case conference history
          </h3>
          {pastConferences.length === 0 && !isLoading ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground text-sm">
                No case conferences recorded{selectedResident !== "all" ? " for this resident" : ""}.
              </CardContent>
            </Card>
          ) : (
            pastConferences.map((v) => (
              <VisitCard
                key={v.visitationId}
                v={v}
                res={residentLookup.get(v.residentId)}
                onOpen={openDetail}
                onEdit={openEdit}
              />
            ))
          )}
        </section>

        {/* ── Visit history ── */}
        <section className="space-y-3">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <HomeIcon className="w-4 h-4" /> Visit history
          </h3>
          {pastVisits.length === 0 && !isLoading ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground text-sm">
                No visits logged{selectedResident !== "all" ? " for this resident" : ""}. Click "Log Visit" to record a home visitation.
              </CardContent>
            </Card>
          ) : (
            pastVisits.map((v) => (
              <VisitCard
                key={v.visitationId}
                v={v}
                res={residentLookup.get(v.residentId)}
                onOpen={openDetail}
                onEdit={openEdit}
              />
            ))
          )}
        </section>
      </div>

      {/* ══ DETAIL SHEET ═══════════════════════════════════════════════════════ */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0">
          {selected && (() => {
            const res = residentLookup.get(selected.residentId);
            return (
              <div>
                <div className="bg-secondary px-6 py-6">
                  <SheetHeader>
                    <SheetTitle className="text-white text-lg flex items-center gap-2">
                      <HomeIcon className="w-5 h-5" />
                      {selected.visitType ?? "Visit"} — {fmtDate(selected.visitDate)}
                    </SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {res && (
                      <Badge variant="outline" className="text-white border-white/40 bg-white/10">
                        {displayName(res)}
                      </Badge>
                    )}
                    {res?.safehouse?.name && (
                      <Badge variant="outline" className="text-white border-white/40 bg-white/10">
                        {res.safehouse.name}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 px-6 py-3 border-b bg-muted/30">
                  <Button size="sm" variant="outline" onClick={() => openEdit(selected)}>
                    <Pencil className="w-3.5 h-3.5 mr-1" /> Edit visit
                  </Button>
                </div>

                <div className="px-6 py-6 space-y-6">

                  {/* Overview grid */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Social Worker</p>
                      <p className="font-medium">{selected.socialWorker || "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Location Visited</p>
                      <p className="font-medium flex items-center gap-1">
                        {selected.locationVisited
                          ? <><MapPin className="w-3.5 h-3.5 text-muted-foreground" />{selected.locationVisited}</>
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Family Cooperation</p>
                      <Badge
                        className={
                          cooperationColor[(selected.familyCooperationLevel ?? "").toLowerCase()] ??
                          "bg-muted text-muted-foreground"
                        }
                      >
                        {selected.familyCooperationLevel || "—"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Family Members Present</p>
                      <p className="font-medium">{selected.familyMembersPresent || "—"}</p>
                    </div>
                    {selected.purpose && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Purpose</p>
                        <p className="font-medium">{selected.purpose}</p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Safety concern — explicit status block */}
                  <div className={`rounded-lg border p-4 ${selected.safetyConcernsNoted ? "border-primary/40 bg-primary/5" : "border-success/30 bg-success/5"}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <ShieldAlert className={`w-4 h-4 ${selected.safetyConcernsNoted ? "text-primary" : "text-success"}`} />
                      <p className="text-sm font-semibold uppercase tracking-wide">Safety Concerns</p>
                    </div>
                    <p className={`text-sm font-medium ${selected.safetyConcernsNoted ? "text-primary" : "text-success"}`}>
                      {selected.safetyConcernsNoted ? "Yes — concerns were noted during this visit" : "None observed"}
                    </p>
                  </div>

                  {/* Follow-up needed — explicit yes/no block */}
                  <div className={`rounded-lg border p-4 ${selected.followUpNeeded ? "border-secondary/40 bg-secondary/5" : "border-muted bg-muted/20"}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <CheckSquare className={`w-4 h-4 ${selected.followUpNeeded ? "text-secondary" : "text-muted-foreground"}`} />
                      <p className="text-sm font-semibold uppercase tracking-wide">Follow-up Required</p>
                    </div>
                    <p className={`text-sm font-medium mb-2 ${selected.followUpNeeded ? "text-secondary" : "text-muted-foreground"}`}>
                      {selected.followUpNeeded ? "Yes — action needed before next visit" : "No follow-up required"}
                    </p>
                    {selected.followUpNotes && (
                      <Textarea
                        readOnly
                        rows={3}
                        value={selected.followUpNotes}
                        className="resize-none bg-background text-sm mt-1"
                      />
                    )}
                  </div>

                  <Separator />

                  {/* Home environment description */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <HomeIcon className="w-4 h-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold uppercase tracking-wide">Home Environment</h3>
                    </div>
                    <Textarea
                      readOnly
                      rows={3}
                      value={selected.observations ?? ""}
                      placeholder="No home environment assessment recorded."
                      className="resize-none bg-muted/30 text-sm"
                    />
                  </div>

                  {/* Photo / video section */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Camera className="w-4 h-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold uppercase tracking-wide">Photos & Videos</h3>
                    </div>
                    <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center text-muted-foreground space-y-2">
                      <Camera className="w-8 h-8 mx-auto opacity-30" />
                      <p className="text-sm">No media attached to this visit.</p>
                      <p className="text-xs">Photo and video upload will be available in a future update.</p>
                    </div>
                  </div>

                  {/* Visit outcome */}
                  {selected.visitOutcome && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Visit Outcome</p>
                        <p className="text-sm font-medium">{selected.visitOutcome}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* ══ CREATE / EDIT DIALOG ═══════════════════════════════════════════════ */}
      <Dialog open={createOpen} onOpenChange={(o) => { if (!o) closeForm(); else setCreateOpen(true); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Visit Record" : "Log a Home / Field Visit"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">

            {/* ── Section: Visit basics ── */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Visit Details</p>
              <div className="space-y-4">
                <div>
                  <Label>Resident *</Label>
                  <select
                    className="w-full border rounded-md h-10 px-3 bg-background text-sm mt-1"
                    value={form.residentId}
                    onChange={(e) => setForm({ ...form, residentId: Number(e.target.value) })}
                  >
                    <option value={0}>Select a resident…</option>
                    {(residents ?? []).map((r) => (
                      <option key={r.residentId} value={r.residentId}>
                        {displayName(r)}{r.safehouse ? ` · ${r.safehouse.name}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Visit date</Label>
                    <Input
                      type="date"
                      className="mt-1"
                      value={form.visitDate}
                      onChange={(e) => setForm({ ...form, visitDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Visit type</Label>
                    <select
                      className="w-full border rounded-md h-10 px-3 bg-background text-sm mt-1"
                      value={form.visitType}
                      onChange={(e) => setForm({ ...form, visitType: e.target.value })}
                    >
                      {VISIT_TYPES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Social worker</Label>
                    <Input
                      className="mt-1"
                      value={form.socialWorker}
                      onChange={(e) => setForm({ ...form, socialWorker: e.target.value })}
                      placeholder="e.g. SW-02"
                    />
                  </div>
                  <div>
                    <Label>Location visited</Label>
                    <select
                      className="w-full border rounded-md h-10 px-3 bg-background text-sm mt-1"
                      value={form.locationVisited}
                      onChange={(e) => setForm({ ...form, locationVisited: e.target.value })}
                    >
                      {LOCATION_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <Label>Purpose of visit</Label>
                  <select
                    className="w-full border rounded-md h-10 px-3 bg-background text-sm mt-1"
                    value={form.purpose}
                    onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                  >
                    {PURPOSE_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Section: Home environment ── */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
                <HomeIcon className="w-3.5 h-3.5" /> Home Environment
              </p>
              <div>
                <Label>Home environment assessment</Label>
                <select
                  className="w-full border rounded-md h-10 px-3 bg-background text-sm mt-1"
                  value={form.homeEnvironment}
                  onChange={(e) => setForm({ ...form, homeEnvironment: e.target.value })}
                >
                  {HOME_ENV_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>

            <Separator />

            {/* ── Section: Family ── */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Family
              </p>
              <div className="space-y-4">
                <div>
                  <Label className="mb-1 block">Family member present</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      value={form.familyMemberName}
                      onChange={(e) => setForm({ ...form, familyMemberName: e.target.value })}
                      placeholder="Full name"
                    />
                    <select
                      className="w-full border rounded-md h-10 px-3 bg-background text-sm"
                      value={form.familyMemberRelationship}
                      onChange={(e) => setForm({ ...form, familyMemberRelationship: e.target.value })}
                    >
                      {RELATIONSHIP_OPTIONS.map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <Label>Family cooperation level</Label>
                  <select
                    className="w-full border rounded-md h-10 px-3 bg-background text-sm mt-1"
                    value={form.familyCooperationLevel}
                    onChange={(e) => setForm({ ...form, familyCooperationLevel: e.target.value })}
                  >
                    {COOPERATION_LEVELS.map((l) => <option key={l}>{l}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Section: Safety & Follow-up ── */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" /> Safety & Follow-up
              </p>
              <div className="space-y-4">
                <div>
                  <Label>Safety concerns</Label>
                  <select
                    className="w-full border rounded-md h-10 px-3 bg-background text-sm mt-1"
                    value={form.safetyConcernsLevel}
                    onChange={(e) => setForm({ ...form, safetyConcernsLevel: e.target.value })}
                  >
                    {SAFETY_CONCERN_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Follow-up actions</Label>
                  <Textarea
                    rows={3}
                    className="mt-1"
                    value={form.followUpNotes}
                    onChange={(e) => setForm({ ...form, followUpNotes: e.target.value })}
                    placeholder="Actions to be taken before the next visit…"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Section: Outcome ── */}
            <div>
              <Label>Visit outcome</Label>
              <select
                className="w-full border rounded-md h-10 px-3 bg-background text-sm mt-1"
                value={form.visitOutcome}
                onChange={(e) => setForm({ ...form, visitOutcome: e.target.value })}
              >
                {OUTCOME_OPTIONS.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Cancel</Button>
            <Button
              onClick={() => {
                if (isEditing && editingId !== null) {
                  updateMut.mutate({ ...form, visitationId: editingId });
                } else {
                  createMut.mutate(form);
                }
              }}
              disabled={!form.residentId || createMut.isPending || updateMut.isPending}
            >
              {createMut.isPending || updateMut.isPending ? "Saving…" : isEditing ? "Save Changes" : "Save Visit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

// ─── Visit Card ───────────────────────────────────────────────────────────────

const VisitCard = ({
  v,
  res,
  onOpen,
  onEdit,
}: {
  v: HomeVisitationRow;
  res?: ResidentRow;
  onOpen: (v: HomeVisitationRow) => void;
  onEdit: (v: HomeVisitationRow) => void;
}) => (
  <Card
    className="hover:shadow-md transition-shadow cursor-pointer group"
    onClick={() => onOpen(v)}
  >
    <CardContent className="p-5 space-y-3">

      {/* Row 1: date · resident · safehouse · social worker · actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 font-semibold text-sm">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          {fmtDate(v.visitDate)}
        </div>

        {res && <Badge variant="secondary">{displayName(res)}</Badge>}

        {res?.safehouse?.name && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Building2 className="w-3.5 h-3.5" />
            {res.safehouse.name}
          </div>
        )}

        {v.socialWorker && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="w-3.5 h-3.5" />
            {v.socialWorker}
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => { e.stopPropagation(); onEdit(v); }}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </div>
      </div>

      {/* Row 2: visit type · cooperation level · safety badge */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="font-medium">{v.visitType ?? "Visit"}</Badge>

        {v.familyCooperationLevel && (
          <Badge
            className={
              cooperationColor[v.familyCooperationLevel.toLowerCase()] ??
              "bg-muted text-muted-foreground"
            }
          >
            <Users className="w-3 h-3 mr-1" />
            {v.familyCooperationLevel} cooperation
          </Badge>
        )}

        {v.safetyConcernsNoted && (
          <Badge className="bg-primary/10 text-primary border-primary/20">
            <AlertTriangle className="w-3 h-3 mr-1" /> Safety concerns
          </Badge>
        )}

        {v.locationVisited && (
          <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
            <MapPin className="w-3 h-3" /> {v.locationVisited}
          </span>
        )}
      </div>

    </CardContent>
  </Card>
);

export default HomeVisitation;
