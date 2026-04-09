import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Search,
  Plus,
  UserCircle,
  Pencil,
  Trash2,
  Heart,
  Brain,
  ChevronRight,
  ShieldAlert,
  Home,
  Users,
  FileText,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/api/client";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useAuth } from "@/api/AuthContext";
import { toast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResidentRow {
  residentId: number;
  safehouseId: number;
  caseControlNo: string | null;
  internalCode: string | null;
  caseStatus: string | null;
  caseCategory: string | null;
  dateOfBirth: string | null;
  dateOfAdmission: string | null;
  currentRiskLevel: string | null;
  assignedSocialWorker: string | null;
  notesRestricted?: string | null;
  safehouse: { name: string; city?: string | null; region?: string | null } | null;
}

interface SafehouseOption {
  safehouseId: number;
  name: string;
}

// Full entity from GET /api/residents/{id} — mirrors Resident.cs
interface ResidentEntity {
  residentId: number;
  safehouseId: number;
  caseControlNo: string | null;
  internalCode: string | null;
  caseStatus: string | null;
  caseCategory: string | null;
  sex: string | null;
  dateOfBirth: string | null;
  dateOfAdmission: string | null;
  currentRiskLevel: string | null;
  initialRiskLevel: string | null;
  notesRestricted: string | null;
  assignedSocialWorker: string | null;
  presentAge: string | null;
  ageUponAdmission: string | null;
  religion: string | null;
  birthStatus: string | null;
  placeOfBirth: string | null;
  initialCaseAssessment: string | null;
  referralSource: string | null;
  referringAgencyPerson: string | null;
  dateEnrolled: string | null;
  dateColbObtained: string | null;
  dateColbRegistered: string | null;
  dateCaseStudyPrepared: string | null;
  dateClosed: string | null;
  lengthOfStay: string | null;
  reintegrationStatus: string | null;
  reintegrationType: string | null;
  // Disability
  isPwd: boolean | null;
  pwdType: string | null;
  hasSpecialNeeds: boolean | null;
  specialNeedsDiagnosis: string | null;
  // Family socio-demographic
  familySoloParent: boolean | null;
  familyIndigenous: boolean | null;
  familyIs4ps: boolean | null;
  familyInformalSettler: boolean | null;
  familyParentPwd: boolean | null;
  // Sub-categories
  subCatPhysicalAbuse: boolean | null;
  subCatSexualAbuse: boolean | null;
  subCatChildLabor: boolean | null;
  subCatTrafficked: boolean | null;
  subCatOsaec: boolean | null;
  subCatCicl: boolean | null;
  subCatOrphaned: boolean | null;
  subCatStreetChild: boolean | null;
  subCatAtRisk: boolean | null;
  subCatChildWithHiv: boolean | null;
  [key: string]: unknown;
}

// ─── Constants & helpers ──────────────────────────────────────────────────────

const stageSteps = ["Intake", "Program", "Exit prep", "Follow-up"] as const;
type Stage = (typeof stageSteps)[number];

const statusColor: Record<string, string> = {
  Intake: "bg-gold/10 text-gold border-gold/20",
  Program: "bg-success/10 text-success border-success/20",
  "Exit prep": "bg-secondary/10 text-secondary border-secondary/20",
  "Follow-up": "bg-secondary/10 text-secondary border-secondary/20",
  Closed: "bg-muted text-muted-foreground",
  Transferred: "bg-muted text-muted-foreground",
  // legacy values from old data
  Active: "bg-success/10 text-success border-success/20",
  Open: "bg-success/10 text-success border-success/20",
};

const riskColor: Record<string, string> = {
  low: "bg-success/10 text-success border-success/20",
  medium: "bg-gold/10 text-gold border-gold/20",
  high: "bg-primary/10 text-primary border-primary/20",
  critical: "bg-primary/20 text-primary border-primary/40",
};

const deriveStage = (r: ResidentRow | { caseStatus?: string | null }): Stage => {
  const s = (r.caseStatus ?? "").trim();
  if (s === "Intake") return "Intake";
  if (s === "Program") return "Program";
  if (s === "Exit prep") return "Exit prep";
  if (s === "Follow-up") return "Follow-up";
  // legacy / closed states — best-effort mapping
  if (s.toLowerCase().includes("intake")) return "Intake";
  if (s.toLowerCase().includes("exit") || s.toLowerCase().includes("transition")) return "Exit prep";
  if (s.toLowerCase().includes("follow") || s.toLowerCase().includes("closed") || s.toLowerCase().includes("reintegrated")) return "Follow-up";
  return "Program";
};

const displayName = (r: ResidentRow | ResidentEntity) =>
  (r as ResidentRow).internalCode ||
  (r as ResidentRow).caseControlNo ||
  `Resident #${r.residentId}`;

const statusLabel = (r: ResidentRow) => r.caseStatus || "Unknown";

const ANY = "__any__";
const statusOptions = ["Intake", "Program", "Exit prep", "Follow-up", "Closed", "Transferred"] as const;
const priorityOptions = ["low", "medium", "high", "critical"] as const;

const toDateInput = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

const emptyEntity = (): ResidentEntity => ({
  residentId: 0,
  safehouseId: 0,
  caseControlNo: null,
  internalCode: null,
  caseStatus: "Intake",
  caseCategory: null,
  sex: null,
  dateOfBirth: null,
  dateOfAdmission: new Date().toISOString(),
  currentRiskLevel: "low",
  initialRiskLevel: null,
  notesRestricted: null,
  assignedSocialWorker: null,
  presentAge: null,
  ageUponAdmission: null,
  religion: null,
  birthStatus: null,
  placeOfBirth: null,
  initialCaseAssessment: null,
  referralSource: null,
  referringAgencyPerson: null,
  dateEnrolled: null,
  dateColbObtained: null,
  dateColbRegistered: null,
  dateCaseStudyPrepared: null,
  dateClosed: null,
  lengthOfStay: null,
  reintegrationStatus: null,
  reintegrationType: null,
  isPwd: null,
  pwdType: null,
  hasSpecialNeeds: null,
  specialNeedsDiagnosis: null,
  familySoloParent: null,
  familyIndigenous: null,
  familyIs4ps: null,
  familyInformalSettler: null,
  familyParentPwd: null,
  subCatPhysicalAbuse: null,
  subCatSexualAbuse: null,
  subCatChildLabor: null,
  subCatTrafficked: null,
  subCatOsaec: null,
  subCatCicl: null,
  subCatOrphaned: null,
  subCatStreetChild: null,
  subCatAtRisk: null,
  subCatChildWithHiv: null,
});

// ─── Detail sheet sub-components ─────────────────────────────────────────────

function DetailSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-muted-foreground">{icon}</span>
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
          {title}
        </h3>
      </div>
      <div className="pl-6">{children}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-2 py-1.5 text-sm border-b border-border/50 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium break-words">{value || "—"}</span>
    </div>
  );
}

function SubCatBadges({ entity }: { entity: ResidentEntity }) {
  const active: string[] = [];
  if (entity.subCatTrafficked) active.push("Trafficked");
  if (entity.subCatPhysicalAbuse) active.push("Physical abuse");
  if (entity.subCatSexualAbuse) active.push("Sexual abuse");
  if (entity.subCatChildLabor) active.push("Child labor");
  if (entity.subCatOsaec) active.push("OSAEC");
  if (entity.subCatCicl) active.push("CICL");
  if (entity.subCatOrphaned) active.push("Orphaned");
  if (entity.subCatStreetChild) active.push("Street child");
  if (entity.subCatAtRisk) active.push("At risk");
  if (entity.subCatChildWithHiv) active.push("Child with HIV");
  if (active.length === 0) return <span className="text-sm text-muted-foreground">None recorded</span>;
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {active.map((s) => (
        <Badge key={s} variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
          {s}
        </Badge>
      ))}
    </div>
  );
}

function FamilyFlags({ entity }: { entity: ResidentEntity }) {
  const active: string[] = [];
  if (entity.familyIs4ps) active.push("4Ps beneficiary");
  if (entity.familySoloParent) active.push("Solo parent household");
  if (entity.familyIndigenous) active.push("Indigenous group");
  if (entity.familyInformalSettler) active.push("Informal settler");
  if (entity.familyParentPwd) active.push("Parent with disability (PWD)");
  if (active.length === 0) return <span className="text-sm text-muted-foreground">None recorded</span>;
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {active.map((s) => (
        <Badge key={s} variant="outline" className="text-xs bg-secondary/5 text-secondary border-secondary/20">
          {s}
        </Badge>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const Residents = () => {
  const qc = useQueryClient();
  const { hasRole, isFounder } = useAuth();
  const canWrite = hasRole("Admin") || hasRole("Staff");
  const canDelete = hasRole("Admin");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(ANY);
  const [safehouseFilter, setSafehouseFilter] = useState<string>(ANY);
  const [priorityFilter, setPriorityFilter] = useState<string>(ANY);
  const [categoryFilter, setCategoryFilter] = useState<string>(ANY);

  const { data, isLoading, isError } = useQuery<ResidentRow[]>({
    queryKey: ["residents"],
    queryFn: () => apiFetch<ResidentRow[]>("/api/residents"),
  });

  const { data: safehouseList } = useQuery<SafehouseOption[]>({
    queryKey: ["safehouses"],
    queryFn: () => apiFetch<SafehouseOption[]>("/api/safehouses"),
  });

  const residents = data ?? [];

  const safehouseOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of residents) {
      if (r.safehouse?.name) set.add(r.safehouse.name);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [residents]);

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of residents) {
      if (r.caseCategory) set.add(r.caseCategory);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [residents]);

  const filtered = useMemo(() => {
    let rows = residents;
    if (statusFilter !== ANY)
      rows = rows.filter((r) => (r.caseStatus ?? "").trim() === statusFilter);
    if (safehouseFilter !== ANY)
      rows = rows.filter((r) => (r.safehouse?.name ?? "") === safehouseFilter);
    if (priorityFilter !== ANY)
      rows = rows.filter((r) => (r.currentRiskLevel ?? "").toLowerCase() === priorityFilter);
    if (categoryFilter !== ANY)
      rows = rows.filter((r) => (r.caseCategory ?? "") === categoryFilter);
    if (search.trim().length > 0) {
      const q = search.toLowerCase();
      rows = rows.filter((r) =>
        [displayName(r), r.safehouse?.name ?? "", r.caseStatus ?? "", r.currentRiskLevel ?? "", r.caseCategory ?? "", r.assignedSocialWorker ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    return rows;
  }, [residents, search, statusFilter, safehouseFilter, priorityFilter, categoryFilter]);

  // ── Edit/Create dialog ──
  const [formOpen, setFormOpen] = useState(false);
  const [entity, setEntity] = useState<ResidentEntity>(emptyEntity());
  const [toDelete, setToDelete] = useState<ResidentRow | null>(null);
  const isEditing = entity.residentId !== 0;

  // ── Detail sheet ──
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailEntity, setDetailEntity] = useState<ResidentEntity | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const openDetail = async (row: ResidentRow) => {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const full = await apiFetch<ResidentEntity>(`/api/residents/${row.residentId}`);
      setDetailEntity(full);
    } catch (e) {
      toast({ title: "Could not load resident details", description: (e as Error).message, variant: "destructive" });
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const openCreate = () => {
    const next = emptyEntity();
    if (safehouseList && safehouseList.length > 0) next.safehouseId = safehouseList[0].safehouseId;
    setEntity(next);
    setFormOpen(true);
  };

  const openEdit = async (row: ResidentRow) => {
    try {
      const full = await apiFetch<ResidentEntity>(`/api/residents/${row.residentId}`);
      setEntity(full);
      setFormOpen(true);
    } catch (e) {
      toast({ title: "Could not load resident", description: (e as Error).message, variant: "destructive" });
    }
  };

  const toPayload = (e: ResidentEntity) => ({
    ...e,
    dateOfBirth: e.dateOfBirth ? new Date(e.dateOfBirth).toISOString() : null,
    dateOfAdmission: e.dateOfAdmission ? new Date(e.dateOfAdmission).toISOString() : null,
  });

  const createMut = useMutation({
    mutationFn: (payload: ResidentEntity) =>
      apiFetch<ResidentEntity>("/api/residents", { method: "POST", body: JSON.stringify(toPayload(payload)) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["residents"] }); qc.invalidateQueries({ queryKey: ["safehouses"] }); toast({ title: "Resident created" }); setFormOpen(false); },
    onError: (e: Error) => toast({ title: "Create failed", description: e.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: (payload: ResidentEntity) =>
      apiFetch<void>(`/api/residents/${payload.residentId}`, { method: "PUT", body: JSON.stringify(toPayload(payload)) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["residents"] }); qc.invalidateQueries({ queryKey: ["safehouses"] }); toast({ title: "Resident updated" }); setFormOpen(false); },
    onError: (e: Error) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiFetch<void>(`/api/residents/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["residents"] }); qc.invalidateQueries({ queryKey: ["safehouses"] }); toast({ title: "Resident deleted" }); setToDelete(null); },
    onError: (e: Error) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entity.safehouseId) { toast({ title: "Safehouse is required", variant: "destructive" }); return; }
    if (isEditing) updateMut.mutate(entity); else createMut.mutate(entity);
  };

  const saving = createMut.isPending || updateMut.isPending;
  const setField = <K extends keyof ResidentEntity>(key: K, value: ResidentEntity[K]) =>
    setEntity((prev) => ({ ...prev, [key]: value }));
  const setBool = (key: keyof ResidentEntity, checked: boolean) =>
    setEntity((prev) => ({ ...prev, [key]: checked }));

  const anyFilterActive = statusFilter !== ANY || safehouseFilter !== ANY || priorityFilter !== ANY || categoryFilter !== ANY;

  return (
    <DashboardLayout title="Caseload Inventory">
      {/* ── Top bar ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by ID, safehouse, social worker…"
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

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground font-medium">Program stage</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Any stage" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any stage</SelectItem>
              {statusOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground font-medium">Case category</label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Any category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any category</SelectItem>
              {categoryOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground font-medium">Safehouse</label>
          <Select value={safehouseFilter} onValueChange={setSafehouseFilter}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Any safehouse" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any safehouse</SelectItem>
              {safehouseOptions.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground font-medium">Priority</label>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Any priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any priority</SelectItem>
              {priorityOptions.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {anyFilterActive && (
          <Button type="button" variant="ghost" size="sm" onClick={() => { setStatusFilter(ANY); setSafehouseFilter(ANY); setPriorityFilter(ANY); setCategoryFilter(ANY); }}>
            Clear filters
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
            to="/ml-insights?tab=outcomes"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
          >
            <Heart className="w-3.5 h-3.5 text-emerald-500" />
            Resident Outcomes
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          </Link>
        </div>
      )}

      {/* ── State messages ── */}
      {isLoading && <p className="text-sm text-muted-foreground">Loading residents…</p>}
      {isError && <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">Could not load residents from the server.</div>}
      {!isLoading && !isError && filtered.length === 0 && <p className="text-sm text-muted-foreground">No residents match the current filters.</p>}
      {!isLoading && filtered.length > 0 && (
        <p className="text-xs text-muted-foreground mb-2">Showing {filtered.length} of {residents.length} residents · Click a card to view full case details</p>
      )}

      {/* ── Resident cards ── */}
      <div className="grid gap-4">
        {filtered.map((r) => {
          const stage = deriveStage(r);
          const stageIndex = stageSteps.indexOf(stage);
          const status = statusLabel(r);
          const risk = (r.currentRiskLevel ?? "").toLowerCase();

          return (
            <Card
              key={r.residentId}
              className="rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => openDetail(r)}
            >
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-full bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
                      <UserCircle className="w-6 h-6 text-secondary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{displayName(r)}</p>
                        <span className="text-xs text-muted-foreground">(#{r.residentId})</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {r.safehouse?.name ?? "Unassigned"}
                        {r.dateOfAdmission ? ` · Since ${r.dateOfAdmission.slice(0, 10)}` : ""}
                      </p>
                      {r.caseCategory && (
                        <p className="text-xs text-muted-foreground mt-0.5">{r.caseCategory}</p>
                      )}
                      {r.assignedSocialWorker && (
                        <p className="text-xs text-muted-foreground">SW: {r.assignedSocialWorker}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {risk && <Badge variant="outline" className={riskColor[risk] ?? ""}>{risk}</Badge>}
                    <Badge variant="outline" className={statusColor[status] || ""}>{status}</Badge>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    {/* Stop propagation so edit/delete don't also open the detail */}
                    {canWrite && (
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(r); }} aria-label={`Edit ${displayName(r)}`}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); setToDelete(r); }} aria-label={`Delete ${displayName(r)}`}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Progress tracker */}
                <div className="mt-4 flex items-center gap-1">
                  {stageSteps.map((step, i) => (
                    <div key={step} className="flex-1">
                      <div className={`h-1.5 rounded-full ${i <= stageIndex ? "bg-success" : "bg-muted"}`} />
                      <p className={`text-[10px] mt-1 ${i <= stageIndex ? "text-success font-medium" : "text-muted-foreground"}`}>{step}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ──────────────────────────────────────────────────────────────────────
          DETAIL SHEET — full caseload inventory panel
          ────────────────────────────────────────────────────────────────── */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
          {detailLoading && (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Loading case details…
            </div>
          )}

          {!detailLoading && detailEntity && (() => {
            const d = detailEntity;
            const risk = (d.currentRiskLevel ?? "").toLowerCase();
            const status = d.caseStatus || "Unknown";
            const stageIndex = stageSteps.indexOf(deriveStage(d as unknown as ResidentRow));

            return (
              <div>
                {/* Header */}
                <div className="bg-secondary px-6 py-6">
                  <SheetHeader>
                    <SheetTitle className="text-white text-xl flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                        <UserCircle className="w-6 h-6 text-white" />
                      </div>
                      {displayName(d)}
                    </SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge variant="outline" className="text-white border-white/40 bg-white/10">{status}</Badge>
                    {risk && <Badge variant="outline" className="text-white border-white/40 bg-white/10 capitalize">{risk} risk</Badge>}
                    {d.caseCategory && <Badge variant="outline" className="text-white border-white/40 bg-white/10">{d.caseCategory}</Badge>}
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4 flex items-center gap-1">
                    {stageSteps.map((step, i) => (
                      <div key={step} className="flex-1">
                        <div className={`h-1.5 rounded-full ${i <= stageIndex ? "bg-white" : "bg-white/25"}`} />
                        <p className={`text-[10px] mt-1 ${i <= stageIndex ? "text-white font-medium" : "text-white/50"}`}>{step}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 px-6 py-3 border-b bg-muted/30">
                  {canWrite && (
                    <Button size="sm" variant="outline" onClick={() => { setDetailOpen(false); openEdit(d as unknown as ResidentRow); }}>
                      <Pencil className="w-3.5 h-3.5 mr-1" /> Edit record
                    </Button>
                  )}
                  <Link to={`/process-recording?residentId=${d.residentId}`}>
                    <Button size="sm" variant="outline"><FileText className="w-3.5 h-3.5 mr-1" /> Process recordings</Button>
                  </Link>
                  <Link to={`/home-visitation?residentId=${d.residentId}`}>
                    <Button size="sm" variant="outline"><Home className="w-3.5 h-3.5 mr-1" /> Home visits</Button>
                  </Link>
                </div>

                {/* Sections */}
                <div className="px-6 py-6 space-y-6">

                  {/* 1. Overview */}
                  <DetailSection icon={<FileText className="w-4 h-4" />} title="Case Overview">
                    <DetailRow label="Case control #" value={d.caseControlNo} />
                    <DetailRow label="Internal code" value={d.internalCode} />
                    <DetailRow label="Resident ID" value={String(d.residentId)} />
                    <DetailRow label="Assigned social worker" value={d.assignedSocialWorker} />
                    <DetailRow label="Initial risk level" value={d.initialRiskLevel} />
                    <DetailRow label="Current risk level" value={d.currentRiskLevel} />
                    <DetailRow label="Length of stay" value={d.lengthOfStay} />
                  </DetailSection>

                  <Separator />

                  {/* 2. Demographics */}
                  <DetailSection icon={<UserCircle className="w-4 h-4" />} title="Demographics">
                    <DetailRow label="Sex" value={d.sex} />
                    <DetailRow label="Date of birth" value={fmtDate(d.dateOfBirth)} />
                    <DetailRow label="Present age" value={d.presentAge} />
                    <DetailRow label="Age upon admission" value={d.ageUponAdmission} />
                    <DetailRow label="Birth status" value={d.birthStatus} />
                    <DetailRow label="Place of birth" value={d.placeOfBirth} />
                    <DetailRow label="Religion" value={d.religion} />
                  </DetailSection>

                  <Separator />

                  {/* 3. Case Classification */}
                  <DetailSection icon={<AlertTriangle className="w-4 h-4" />} title="Case Classification">
                    <DetailRow label="Primary category" value={d.caseCategory} />
                    <div className="py-1.5">
                      <p className="text-sm text-muted-foreground mb-1.5">Sub-categories</p>
                      <SubCatBadges entity={d} />
                    </div>
                    <DetailRow label="Initial case assessment" value={d.initialCaseAssessment} />
                  </DetailSection>

                  <Separator />

                  {/* 4. Disability */}
                  <DetailSection icon={<ShieldAlert className="w-4 h-4" />} title="Disability Information">
                    <DetailRow label="Person with disability (PWD)" value={d.isPwd === true ? "Yes" : d.isPwd === false ? "No" : "—"} />
                    <DetailRow label="PWD type" value={d.pwdType} />
                    <DetailRow label="Has special needs" value={d.hasSpecialNeeds === true ? "Yes" : d.hasSpecialNeeds === false ? "No" : "—"} />
                    <DetailRow label="Special needs diagnosis" value={d.specialNeedsDiagnosis} />
                  </DetailSection>

                  <Separator />

                  {/* 5. Family Socio-Demographic */}
                  <DetailSection icon={<Users className="w-4 h-4" />} title="Family Socio-Demographic Profile">
                    <div className="py-1.5">
                      <FamilyFlags entity={d} />
                    </div>
                  </DetailSection>

                  <Separator />

                  {/* 6. Admission & Referral */}
                  <DetailSection icon={<Home className="w-4 h-4" />} title="Admission & Referral">
                    <DetailRow label="Date of admission" value={fmtDate(d.dateOfAdmission)} />
                    <DetailRow label="Date enrolled" value={fmtDate(d.dateEnrolled)} />
                    <DetailRow label="Date COLB obtained" value={fmtDate(d.dateColbObtained)} />
                    <DetailRow label="Date COLB registered" value={fmtDate(d.dateColbRegistered)} />
                    <DetailRow label="Date case study prepared" value={fmtDate(d.dateCaseStudyPrepared)} />
                    <DetailRow label="Referral source" value={d.referralSource} />
                    <DetailRow label="Referring agency / person" value={d.referringAgencyPerson} />
                  </DetailSection>

                  <Separator />

                  {/* 7. Reintegration */}
                  <DetailSection icon={<RefreshCw className="w-4 h-4" />} title="Reintegration Tracking">
                    <DetailRow label="Reintegration status" value={d.reintegrationStatus} />
                    <DetailRow label="Reintegration type" value={d.reintegrationType} />
                    <DetailRow label="Date closed" value={fmtDate(d.dateClosed)} />
                  </DetailSection>

                  {/* 8. Admin-only restricted notes */}
                  {hasRole("Admin") && d.notesRestricted && (
                    <>
                      <Separator />
                      <DetailSection icon={<ShieldAlert className="w-4 h-4 text-destructive" />} title="Restricted Notes (Admin only)">
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{d.notesRestricted}</p>
                      </DetailSection>
                    </>
                  )}

                </div>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* ── Create / Edit dialog ── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit resident" : "New resident"}</DialogTitle>
            <DialogDescription>Fill in the case details. All fields except Safehouse are optional.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 py-2">

            {/* Core identifiers */}
            <div className="grid grid-cols-2 gap-4">
              <div><Label htmlFor="r-control">Case control #</Label><Input id="r-control" value={entity.caseControlNo ?? ""} onChange={(e) => setField("caseControlNo", e.target.value)} placeholder="e.g. 2026-0042" /></div>
              <div><Label htmlFor="r-code">Internal code</Label><Input id="r-code" value={entity.internalCode ?? ""} onChange={(e) => setField("internalCode", e.target.value)} placeholder="e.g. LHS2-07" /></div>
            </div>

            <div>
              <Label htmlFor="r-safehouse">Safehouse *</Label>
              <select id="r-safehouse" className="w-full border rounded-md h-10 px-3 bg-background" value={entity.safehouseId} onChange={(e) => setField("safehouseId", Number(e.target.value))} required>
                <option value={0}>Select a safehouse…</option>
                {(safehouseList ?? []).map((s) => <option key={s.safehouseId} value={s.safehouseId}>{s.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="r-status">Program stage</Label>
                <select id="r-status" className="w-full border rounded-md h-10 px-3 bg-background" value={entity.caseStatus ?? "Intake"} onChange={(e) => setField("caseStatus", e.target.value)}>
                  <option value="Intake">Intake</option>
                  <option value="Program">Program</option>
                  <option value="Exit prep">Exit prep</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Closed">Closed</option>
                  <option value="Transferred">Transferred</option>
                </select>
              </div>
              <div>
                <Label htmlFor="r-risk">Risk level</Label>
                <select id="r-risk" className="w-full border rounded-md h-10 px-3 bg-background" value={entity.currentRiskLevel ?? "low"} onChange={(e) => setField("currentRiskLevel", e.target.value)}>
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
                </select>
              </div>
            </div>

            {/* Demographics */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2">Demographics</p>
            <div className="grid grid-cols-2 gap-4">
              <div><Label htmlFor="r-sex">Sex</Label><Input id="r-sex" value={entity.sex ?? ""} onChange={(e) => setField("sex", e.target.value)} /></div>
              <div><Label htmlFor="r-dob">Date of birth</Label><Input id="r-dob" type="date" value={toDateInput(entity.dateOfBirth)} onChange={(e) => setField("dateOfBirth", e.target.value ? new Date(e.target.value).toISOString() : null)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label htmlFor="r-religion">Religion</Label><Input id="r-religion" value={entity.religion ?? ""} onChange={(e) => setField("religion", e.target.value)} /></div>
              <div><Label htmlFor="r-pob">Place of birth</Label><Input id="r-pob" value={entity.placeOfBirth ?? ""} onChange={(e) => setField("placeOfBirth", e.target.value)} /></div>
            </div>

            {/* Case classification */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2">Case Classification</p>
            <div><Label htmlFor="r-category">Primary case category</Label><Input id="r-category" value={entity.caseCategory ?? ""} onChange={(e) => setField("caseCategory", e.target.value)} placeholder="e.g. Child in Need of Special Protection" /></div>

            <div>
              <Label className="mb-2 block">Sub-categories (check all that apply)</Label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ["subCatTrafficked", "Trafficked"],
                  ["subCatPhysicalAbuse", "Physical abuse"],
                  ["subCatSexualAbuse", "Sexual abuse"],
                  ["subCatChildLabor", "Child labor"],
                  ["subCatOsaec", "OSAEC"],
                  ["subCatCicl", "CICL"],
                  ["subCatOrphaned", "Orphaned"],
                  ["subCatStreetChild", "Street child"],
                  ["subCatAtRisk", "At risk"],
                  ["subCatChildWithHiv", "Child with HIV"],
                ] as [keyof ResidentEntity, string][]).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!entity[key]}
                      onChange={(e) => setBool(key, e.target.checked)}
                      className="rounded border-border"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div><Label htmlFor="r-assessment">Initial case assessment</Label><Textarea id="r-assessment" rows={3} value={entity.initialCaseAssessment ?? ""} onChange={(e) => setField("initialCaseAssessment", e.target.value)} /></div>

            {/* Disability */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2">Disability</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Person with disability (PWD)</Label>
                <select className="w-full border rounded-md h-10 px-3 bg-background mt-1" value={entity.isPwd === null ? "" : entity.isPwd ? "yes" : "no"} onChange={(e) => setField("isPwd", e.target.value === "" ? null : e.target.value === "yes")}>
                  <option value="">Unknown</option><option value="yes">Yes</option><option value="no">No</option>
                </select>
              </div>
              <div><Label htmlFor="r-pwdtype">PWD type</Label><Input id="r-pwdtype" value={entity.pwdType ?? ""} onChange={(e) => setField("pwdType", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Has special needs</Label>
                <select className="w-full border rounded-md h-10 px-3 bg-background mt-1" value={entity.hasSpecialNeeds === null ? "" : entity.hasSpecialNeeds ? "yes" : "no"} onChange={(e) => setField("hasSpecialNeeds", e.target.value === "" ? null : e.target.value === "yes")}>
                  <option value="">Unknown</option><option value="yes">Yes</option><option value="no">No</option>
                </select>
              </div>
              <div><Label htmlFor="r-sndiag">Special needs diagnosis</Label><Input id="r-sndiag" value={entity.specialNeedsDiagnosis ?? ""} onChange={(e) => setField("specialNeedsDiagnosis", e.target.value)} /></div>
            </div>

            {/* Family socio-demographic */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2">Family Socio-Demographic Profile</p>
            <div className="grid grid-cols-2 gap-2">
              {([
                ["familyIs4ps", "4Ps beneficiary"],
                ["familySoloParent", "Solo parent household"],
                ["familyIndigenous", "Indigenous group"],
                ["familyInformalSettler", "Informal settler"],
                ["familyParentPwd", "Parent with disability (PWD)"],
              ] as [keyof ResidentEntity, string][]).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={!!entity[key]} onChange={(e) => setBool(key, e.target.checked)} className="rounded border-border" />
                  {label}
                </label>
              ))}
            </div>

            {/* Admission & Referral */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2">Admission & Referral</p>
            <div className="grid grid-cols-2 gap-4">
              <div><Label htmlFor="r-admission">Date of admission</Label><Input id="r-admission" type="date" value={toDateInput(entity.dateOfAdmission)} onChange={(e) => setField("dateOfAdmission", e.target.value ? new Date(e.target.value).toISOString() : null)} /></div>
              <div><Label htmlFor="r-enrolled">Date enrolled</Label><Input id="r-enrolled" type="date" value={toDateInput(entity.dateEnrolled)} onChange={(e) => setField("dateEnrolled", e.target.value ? new Date(e.target.value).toISOString() : null)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label htmlFor="r-refsource">Referral source</Label><Input id="r-refsource" value={entity.referralSource ?? ""} onChange={(e) => setField("referralSource", e.target.value)} /></div>
              <div><Label htmlFor="r-refagency">Referring agency / person</Label><Input id="r-refagency" value={entity.referringAgencyPerson ?? ""} onChange={(e) => setField("referringAgencyPerson", e.target.value)} /></div>
            </div>
            <div><Label htmlFor="r-worker">Assigned social worker</Label><Input id="r-worker" value={entity.assignedSocialWorker ?? ""} onChange={(e) => setField("assignedSocialWorker", e.target.value)} /></div>

            {/* Reintegration */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2">Reintegration</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="r-reint-status">Reintegration status</Label>
                <select id="r-reint-status" className="w-full border rounded-md h-10 px-3 bg-background" value={entity.reintegrationStatus ?? ""} onChange={(e) => setField("reintegrationStatus", e.target.value || null)}>
                  <option value="">Not started</option><option>In Progress</option><option>Completed</option>
                </select>
              </div>
              <div>
                <Label htmlFor="r-reint-type">Reintegration type</Label>
                <select id="r-reint-type" className="w-full border rounded-md h-10 px-3 bg-background" value={entity.reintegrationType ?? ""} onChange={(e) => setField("reintegrationType", e.target.value || null)}>
                  <option value="">—</option><option>Family Reunification</option><option>Foster Care</option><option>Independent Living</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label htmlFor="r-dateclosed">Date closed</Label><Input id="r-dateclosed" type="date" value={toDateInput(entity.dateClosed)} onChange={(e) => setField("dateClosed", e.target.value ? new Date(e.target.value).toISOString() : null)} /></div>
            </div>

            {/* Admin restricted notes */}
            {hasRole("Admin") && (
              <div>
                <Label htmlFor="r-notes">Restricted notes (admin-only)</Label>
                <Textarea id="r-notes" rows={3} value={entity.notesRestricted ?? ""} onChange={(e) => setField("notesRestricted", e.target.value)} placeholder="Sensitive case notes. Not visible to Staff." />
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : isEditing ? "Save changes" : "Create resident"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ── */}
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => { if (!v) setToDelete(null); }}
        title="Delete resident?"
        description={toDelete ? `This permanently deletes the case record for ${displayName(toDelete)}. Process recordings, visitations, and other linked history may also become orphaned. This action cannot be undone.` : ""}
        confirmLabel="Delete resident"
        loading={deleteMut.isPending}
        onConfirm={() => { if (toDelete) deleteMut.mutate(toDelete.residentId); }}
      />
    </DashboardLayout>
  );
};

export default Residents;
