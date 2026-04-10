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
  MapPin,
  AlertTriangle,
  Calendar,
  Home as HomeIcon,
  Pencil,
  Trash2,
  Search,
  Users,
  CheckSquare,
  Printer,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/api/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/api/AuthContext";
import ConfirmDialog from "@/components/ConfirmDialog";
import PrintReportHeader from "@/components/PrintReportHeader";
import PrintTable from "@/components/PrintTable";

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

const isUpcoming = (d: string | null) => !!d && new Date(d).getTime() > Date.now();

const cooperationColor: Record<string, string> = {
  high: "bg-success/10 text-success border-success/20",
  medium: "bg-gold/10 text-gold border-gold/20",
  low: "bg-primary/10 text-primary border-primary/20",
  none: "bg-muted text-muted-foreground",
};

const VISIT_TYPES = [
  "Initial assessment",
  "Reintegration assessment",
  "Post-placement monitoring",
  "Emergency",
  "Case conference",
];

interface FormState {
  visitationId: number;
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
  visitType: "Routine Follow Up",
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
  visitType: v.visitType ?? "Routine Follow Up",
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
const HomeVisitation = () => {
  const qc = useQueryClient();
  useAuth();

  const [searchParams] = useSearchParams();
  const initialResident = searchParams.get("residentId");
  const [selectedResident] = useState<number | "all">(
    initialResident ? Number(initialResident) : "all",
  );

  // Create / edit dialog
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  // Detail sheet
  const [selected, setSelected] = useState<HomeVisitationRow | null>(null);
  const sheetOpen = selected !== null;

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<HomeVisitationRow | null>(null);

  // Client-side filters
  const [search, setSearch] = useState("");
  const [visitTypeFilter, setVisitTypeFilter] = useState("__any__");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

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

  const openEdit = (v: HomeVisitationRow) => {
    setSelected(null);
    setEditingId(v.visitationId);
    setForm(toFormState(v));
    setOpen(true);
  };

  const residentLookup = useMemo(() => {
    const m = new Map<number, ResidentRow>();
    (residents ?? []).forEach((r) => m.set(r.residentId, r));
    return m;
  }, [residents]);

  const visitTypesInData = useMemo(() => {
    const seen = new Set<string>();
    (visits ?? []).forEach((v) => { if (v.visitType) seen.add(v.visitType); });
    return Array.from(seen).sort();
  }, [visits]);

  const filteredVisits = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (visits ?? []).filter((v) => {
      if (visitTypeFilter !== "__any__" && (v.visitType ?? "") !== visitTypeFilter) return false;
      if (q) {
        const res = residentLookup.get(v.residentId);
        const haystack = [
          res ? displayName(res) : "",
          res?.safehouse?.name ?? "",
          v.socialWorker ?? "",
          v.locationVisited ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (dateFrom && v.visitDate && new Date(v.visitDate) < new Date(dateFrom)) return false;
      if (dateTo && v.visitDate && new Date(v.visitDate) > new Date(dateTo + "T23:59:59"))
        return false;
      return true;
    });
  }, [visits, residentLookup, search, visitTypeFilter, dateFrom, dateTo]);

  const hasFilters = visitTypeFilter !== "__any__" || dateFrom !== "" || dateTo !== "";
  const clearFilters = () => {
    setVisitTypeFilter("__any__");
    setDateFrom("");
    setDateTo("");
  };

  const upcoming = useMemo(
    () => filteredVisits.filter((v) => isUpcoming(v.visitDate)),
    [filteredVisits],
  );
  const history = useMemo(
    () => filteredVisits.filter((v) => !isUpcoming(v.visitDate)),
    [filteredVisits],
  );

  const scopedResidentName =
    selectedResident !== "all"
      ? (() => {
          const r = residentLookup.get(selectedResident as number);
          return r ? displayName(r) : `Resident #${selectedResident}`;
        })()
      : null;

  const detailResident = selected ? residentLookup.get(selected.residentId) : undefined;

  const printFilters = [
    ...(visitTypeFilter !== "__any__" ? [{ label: "Visit Type", value: visitTypeFilter }] : []),
    ...(dateFrom ? [{ label: "From", value: dateFrom }] : []),
    ...(dateTo ? [{ label: "To", value: dateTo }] : []),
    ...(search.trim() ? [{ label: "Search", value: search.trim() }] : []),
  ];

  return (
    <DashboardLayout title="Home Visitation">
      <PrintReportHeader title="Home Visitation Report" filters={printFilters} count={filteredVisits.length} />
      <div className="space-y-6">

        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <HomeIcon className="w-6 h-6 text-primary" /> Home & Field Visits
          </h2>
          <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
            Log home visits, field assessments, and case conferences. Click any record to view
            full details.
          </p>
        </div>

        {/* Resident scope banner */}
        {scopedResidentName && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
            <span>Showing visits for</span>
            <Badge variant="secondary">{scopedResidentName}</Badge>
          </div>
        )}

        {/* Top bar: search + action */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search resident, safehouse, location, worker…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
              <Printer className="w-4 h-4" /> Print Report
            </Button>
            <Dialog
              open={open}
              onOpenChange={(o) => {
                setOpen(o);
                if (!o) { setEditingId(null); setForm(emptyForm); }
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2" onClick={openCreate}>
                  <Plus className="w-4 h-4" /> Log Visit
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      {VISIT_TYPES.map((t) => <option key={t}>{t}</option>)}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => saveMut.mutate(form)}
                  disabled={!form.residentId || saveMut.isPending}
                >
                  {saveMut.isPending ? "Saving…" : editingId ? "Save Changes" : "Save Visit"}
                </Button>
              </DialogFooter>
            </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap items-end gap-3 print:hidden">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-medium">Visit type</label>
            <Select value={visitTypeFilter} onValueChange={setVisitTypeFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Any type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__any__">Any type</SelectItem>
                {visitTypesInData.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
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
          <span className="text-xs text-muted-foreground ml-auto self-end pb-1">
            {filteredVisits.length} of {visits?.length ?? 0} visit
            {(visits?.length ?? 0) === 1 ? "" : "s"}
          </span>
        </div>

        {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <div>
            <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
              Upcoming case conferences & visits
            </h3>
            <div className="space-y-3">
              {upcoming.map((v) => {
                const res = residentLookup.get(v.residentId);
                return (
                  <button
                    key={v.visitationId}
                    type="button"
                    className="w-full text-left"
                    onClick={() => setSelected(v)}
                  >
                    <Card className="hover:shadow-md transition-shadow border-primary/20">
                      <CardContent className="p-4 space-y-2">
                        <VisitCardContent v={v} res={res} />
                      </CardContent>
                    </Card>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* History */}
        <div>
          <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
            Visit history
          </h3>
          {filteredVisits.length === 0 && !isLoading && (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                {(visits?.length ?? 0) === 0
                  ? "No visits logged yet. Click \"Log Visit\" to record a home visitation."
                  : "No visits match the current filters."}
              </CardContent>
            </Card>
          )}
          <div className="space-y-3">
            {history.map((v) => {
              const res = residentLookup.get(v.residentId);
              return (
                <button
                  key={v.visitationId}
                  type="button"
                  className="w-full text-left"
                  onClick={() => setSelected(v)}
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 space-y-2">
                      <VisitCardContent v={v} res={res} />
                    </CardContent>
                  </Card>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Detail sheet ── */}
      <Sheet open={sheetOpen} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="flex items-center gap-2">
                  <HomeIcon className="w-5 h-5 text-primary" />
                  {selected.visitType ?? "Visit"} — {fmtDate(selected.visitDate)}
                </SheetTitle>
              </SheetHeader>

              {selected.canModify && (
                <div className="flex gap-2 mb-4">
                  <Button size="sm" variant="outline" onClick={() => openEdit(selected)}>
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

              {/* Visit info */}
              <div className="divide-y">
                <DetailRow
                  label="Resident"
                  value={detailResident ? displayName(detailResident) : `#${selected.residentId}`}
                />
                <DetailRow label="Safehouse" value={detailResident?.safehouse?.name} />
                <DetailRow label="Visit date" value={fmtDate(selected.visitDate)} />
                <DetailRow label="Visit type" value={selected.visitType} />
                <DetailRow label="Location" value={selected.locationVisited} />
                <DetailRow label="Social worker" value={selected.socialWorker} />
              </div>

              {/* Purpose & people */}
              <Separator className="my-4" />
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Purpose & Participants
              </p>
              <div className="divide-y">
                <DetailRow label="Purpose" value={selected.purpose} />
                <DetailRow label="Family members present" value={selected.familyMembersPresent} />
                <DetailRow
                  label="Family cooperation"
                  value={
                    selected.familyCooperationLevel ? (
                      <Badge
                        className={
                          cooperationColor[selected.familyCooperationLevel.toLowerCase()] ??
                          "bg-muted text-muted-foreground"
                        }
                      >
                        {selected.familyCooperationLevel}
                      </Badge>
                    ) : null
                  }
                />
              </div>

              {/* Observations & outcome */}
              <Separator className="my-4" />
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Observations & Outcome
              </p>
              <div className="divide-y">
                <DetailRow
                  label="Observations"
                  value={
                    selected.observations ? (
                      <span className="whitespace-pre-wrap">{selected.observations}</span>
                    ) : null
                  }
                />
                <DetailRow label="Visit outcome" value={selected.visitOutcome} />
              </div>

              {/* Follow-up */}
              <Separator className="my-4" />
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Follow-up
              </p>
              <div className="divide-y">
                <DetailRow label="Follow-up needed" value={selected.followUpNeeded ? "Yes" : "No"} />
                <DetailRow label="Follow-up notes" value={selected.followUpNotes} />
              </div>

              {/* Flags */}
              <Separator className="my-4" />
              <div className="flex gap-3">
                <Badge
                  className={
                    selected.safetyConcernsNoted
                      ? "bg-primary/10 text-primary border-primary/20"
                      : "opacity-30"
                  }
                >
                  <AlertTriangle className="w-3 h-3 mr-1" /> Safety concerns
                </Badge>
                <Badge
                  className={
                    selected.followUpNeeded
                      ? "bg-gold/10 text-gold border-gold/20"
                      : "opacity-30"
                  }
                >
                  <CheckSquare className="w-3 h-3 mr-1" /> Follow-up needed
                </Badge>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        title="Delete this home visit?"
        description="This will permanently remove the visit record. This action cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={deleteMut.isPending}
        onConfirm={() => { if (deleteTarget) deleteMut.mutate(deleteTarget.visitationId); }}
      />

      <PrintTable
        columns={[
          { header: "Date", accessor: (r: HomeVisitationRow) => r.visitDate ? new Date(r.visitDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "" },
          { header: "Type", accessor: (r: HomeVisitationRow) => r.visitType ?? "" },
          { header: "Resident", accessor: (r: HomeVisitationRow) => residentLookup.get(r.residentId) ? displayName(residentLookup.get(r.residentId)!) : `#${r.residentId}` },
          { header: "Location", accessor: (r: HomeVisitationRow) => r.locationVisited ?? "" },
          { header: "Social Worker", accessor: (r: HomeVisitationRow) => r.socialWorker ?? "" },
          { header: "Family Coop.", accessor: (r: HomeVisitationRow) => r.familyCooperationLevel ?? "" },
          { header: "Safety", accessor: (r: HomeVisitationRow) => r.safetyConcernsNoted ? "Yes" : "No" },
          { header: "Follow-up", accessor: (r: HomeVisitationRow) => r.followUpNeeded ? "Yes" : "No" },
        ]}
        data={filteredVisits}
        keyAccessor={(r: HomeVisitationRow) => r.visitationId}
      />
    </DashboardLayout>
  );
};

// ---- Card content (badge row + info row) ----
function VisitCardContent({ v, res }: { v: HomeVisitationRow; res?: ResidentRow }) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 font-semibold text-sm">
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
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-muted-foreground">
        {v.locationVisited && (
          <span>
            <MapPin className="w-3 h-3 inline mr-1" />
            <span className="text-foreground font-medium">{v.locationVisited}</span>
          </span>
        )}
        {v.socialWorker && (
          <span>
            Worker: <span className="text-foreground font-medium">{v.socialWorker}</span>
          </span>
        )}
        {v.purpose && (
          <span className="text-muted-foreground truncate max-w-xs">{v.purpose}</span>
        )}
      </div>
    </>
  );
}

export default HomeVisitation;
