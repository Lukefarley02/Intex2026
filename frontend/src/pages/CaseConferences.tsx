import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Calendar,
  Pencil,
  Trash2,
  Search,
  Users,
  Target,
  CheckCircle2,
  Circle,
  Clock,
  PauseCircle,
  ChevronDown,
  ChevronRight,
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

interface InterventionPlanRow {
  planId: number;
  residentId: number;
  planCategory: string;
  planDescription: string | null;
  servicesProvided: string | null;
  targetValue: number | null;
  targetDate: string | null;
  status: string;
  caseConferenceDate: string | null;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string | null;
  canModify: boolean;
}

interface ConferenceGroup {
  date: string; // ISO date string or "unscheduled"
  label: string;
  plans: InterventionPlanRow[];
}

const CATEGORIES = ["Safety", "Education", "Physical Health", "Mental Health"];
const STATUSES = ["Open", "In Progress", "On Hold", "Completed"];
const SERVICES = ["Healing", "Legal", "Teaching", "Counseling", "Medical", "Livelihood", "Spiritual"];

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

const statusIcon = (status: string) => {
  switch (status) {
    case "Completed":
      return <CheckCircle2 className="w-3.5 h-3.5" />;
    case "On Hold":
      return <PauseCircle className="w-3.5 h-3.5" />;
    case "Open":
      return <Circle className="w-3.5 h-3.5" />;
    default:
      return <Clock className="w-3.5 h-3.5" />;
  }
};

const statusColor = (status: string) => {
  switch (status) {
    case "Completed":
      return "bg-success/10 text-success border-success/20";
    case "On Hold":
      return "bg-warning/10 text-warning border-warning/20";
    case "Open":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-primary/10 text-primary border-primary/20";
  }
};

const categoryColor = (cat: string) => {
  switch (cat) {
    case "Safety":
      return "bg-destructive/10 text-destructive border-destructive/20";
    case "Education":
      return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    case "Physical Health":
      return "bg-success/10 text-success border-success/20";
    case "Mental Health":
      return "bg-purple-500/10 text-purple-600 border-purple-500/20";
    default:
      return "bg-muted text-muted-foreground";
  }
};

// ---- Form ----
interface FormState {
  planId: number;
  residentId: number;
  planCategory: string;
  planDescription: string;
  servicesProvided: string;
  targetValue: string;
  targetDate: string;
  status: string;
  caseConferenceDate: string;
}

const emptyForm: FormState = {
  planId: 0,
  residentId: 0,
  planCategory: "Safety",
  planDescription: "",
  servicesProvided: "",
  targetValue: "",
  targetDate: "",
  status: "In Progress",
  caseConferenceDate: new Date().toISOString().slice(0, 10),
};

const toFormState = (ip: InterventionPlanRow): FormState => ({
  planId: ip.planId,
  residentId: ip.residentId,
  planCategory: ip.planCategory ?? "Safety",
  planDescription: ip.planDescription ?? "",
  servicesProvided: ip.servicesProvided ?? "",
  targetValue: ip.targetValue != null ? String(ip.targetValue) : "",
  targetDate: ip.targetDate ? ip.targetDate.slice(0, 10) : "",
  status: ip.status ?? "In Progress",
  caseConferenceDate: ip.caseConferenceDate
    ? ip.caseConferenceDate.slice(0, 10)
    : "",
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
const CaseConferences = () => {
  const qc = useQueryClient();
  useAuth();

  const [searchParams] = useSearchParams();
  void searchParams; // kept for potential future deep-link use

  // Create / edit dialog
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  // Detail sheet
  const [selected, setSelected] = useState<InterventionPlanRow | null>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<InterventionPlanRow | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("__any__");
  const [statusFilter, setStatusFilter] = useState("__any__");

  // Collapsed conference groups
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const { data: residents } = useQuery<ResidentRow[]>({
    queryKey: ["residents"],
    queryFn: () => apiFetch<ResidentRow[]>("/api/residents"),
  });

  const { data: plans, isLoading } = useQuery<InterventionPlanRow[]>({
    queryKey: ["intervention-plans"],
    queryFn: () => apiFetch<InterventionPlanRow[]>("/api/interventionplans"),
  });

  const residentLookup = useMemo(() => {
    const m = new Map<number, ResidentRow>();
    (residents ?? []).forEach((r) => m.set(r.residentId, r));
    return m;
  }, [residents]);

  // Filter plans
  const filteredPlans = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (plans ?? []).filter((ip) => {
      if (categoryFilter !== "__any__" && ip.planCategory !== categoryFilter) return false;
      if (statusFilter !== "__any__" && ip.status !== statusFilter) return false;
      if (q) {
        const res = residentLookup.get(ip.residentId);
        const haystack = [
          res ? displayName(res) : "",
          res?.safehouse?.name ?? "",
          ip.planDescription ?? "",
          ip.planCategory ?? "",
          ip.servicesProvided ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [plans, residentLookup, search, categoryFilter, statusFilter]);

  // Group by case_conference_date, then split into upcoming vs past
  const { upcomingGroups, pastGroups } = useMemo(() => {
    const groups = new Map<string, InterventionPlanRow[]>();
    for (const ip of filteredPlans) {
      const key = ip.caseConferenceDate
        ? ip.caseConferenceDate.slice(0, 10)
        : "__unscheduled__";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(ip);
    }

    const today = new Date().toISOString().slice(0, 10);
    const upcoming: ConferenceGroup[] = [];
    const past: ConferenceGroup[] = [];

    for (const [key, items] of groups.entries()) {
      const group: ConferenceGroup = {
        date: key,
        label:
          key === "__unscheduled__"
            ? "No conference date assigned"
            : fmtDate(key),
        plans: items,
      };
      if (key === "__unscheduled__") {
        past.push(group); // unscheduled goes to past column
      } else if (key >= today) {
        upcoming.push(group);
      } else {
        past.push(group);
      }
    }

    // Upcoming: soonest first; Past: newest first
    upcoming.sort((a, b) => a.date.localeCompare(b.date));
    past.sort((a, b) => {
      if (a.date === "__unscheduled__") return 1;
      if (b.date === "__unscheduled__") return -1;
      return b.date.localeCompare(a.date);
    });

    return { upcomingGroups: upcoming, pastGroups: past };
  }, [filteredPlans]);

  const hasFilters =
    categoryFilter !== "__any__" ||
    statusFilter !== "__any__";
  const clearFilters = () => {
    setCategoryFilter("__any__");
    setStatusFilter("__any__");
  };

  const toggleGroup = (date: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  // ---- Mutations ----
  const buildPayload = (f: FormState) => ({
    planId: f.planId,
    residentId: f.residentId,
    planCategory: f.planCategory,
    planDescription: f.planDescription || null,
    servicesProvided: f.servicesProvided || null,
    targetValue: f.targetValue ? Number(f.targetValue) : null,
    targetDate: f.targetDate ? new Date(f.targetDate).toISOString() : null,
    status: f.status,
    caseConferenceDate: f.caseConferenceDate
      ? new Date(f.caseConferenceDate).toISOString()
      : null,
  });

  const saveMut = useMutation({
    mutationFn: async (f: FormState) => {
      if (f.planId === 0) {
        return apiFetch<InterventionPlanRow>("/api/interventionplans", {
          method: "POST",
          body: JSON.stringify(buildPayload(f)),
        });
      }
      await apiFetch<void>(`/api/interventionplans/${f.planId}`, {
        method: "PUT",
        body: JSON.stringify(buildPayload(f)),
      });
      return null;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["intervention-plans"] });
      toast({
        title: editingId ? "Plan updated" : "Plan created",
        description: "Intervention plan saved successfully.",
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
      apiFetch<void>(`/api/interventionplans/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["intervention-plans"] });
      toast({ title: "Plan deleted" });
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

  const openEdit = (ip: InterventionPlanRow) => {
    setSelected(null);
    setEditingId(ip.planId);
    setForm(toFormState(ip));
    setOpen(true);
  };


  // Summary stats
  const stats = useMemo(() => {
    const all = plans ?? [];
    return {
      total: all.length,
      open: all.filter((p) => p.status === "Open").length,
      inProgress: all.filter((p) => p.status === "In Progress").length,
      completed: all.filter((p) => p.status === "Completed").length,
      onHold: all.filter((p) => p.status === "On Hold").length,
      conferences: new Set(
        all
          .filter((p) => p.caseConferenceDate)
          .map((p) => p.caseConferenceDate!.slice(0, 10))
      ).size,
    };
  }, [plans]);

  const detailResident = selected ? residentLookup.get(selected.residentId) : undefined;
  const sheetOpen = selected !== null;

  // Shared renderer for a conference-date group card
  const renderConferenceGroup = (group: ConferenceGroup) => {
    const collapsed = collapsedGroups.has(group.date);
    return (
      <Card key={group.date}>
        <CardHeader className="p-4 pb-0">
          <button
            type="button"
            className="flex items-center gap-2 w-full text-left"
            onClick={() => toggleGroup(group.date)}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
            <Calendar className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">{group.label}</CardTitle>
            <Badge variant="secondary" className="ml-2">
              {group.plans.length} plan{group.plans.length === 1 ? "" : "s"}
            </Badge>
          </button>
        </CardHeader>
        {!collapsed && (
          <CardContent className="p-4 pt-3 space-y-2">
            {group.plans.map((ip) => {
              const res = residentLookup.get(ip.residentId);
              return (
                <button
                  key={ip.planId}
                  type="button"
                  className="w-full text-left"
                  onClick={() => setSelected(ip)}
                >
                  <div className="border rounded-lg p-3 hover:shadow-sm transition-shadow space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={categoryColor(ip.planCategory)}>
                        {ip.planCategory}
                      </Badge>
                      <Badge className={statusColor(ip.status)}>
                        {statusIcon(ip.status)}
                        <span className="ml-1">{ip.status}</span>
                      </Badge>
                      {res && (
                        <Badge variant="secondary">{displayName(res)}</Badge>
                      )}
                      {ip.targetDate && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                          <Target className="w-3 h-3" />
                          Target: {fmtDate(ip.targetDate)}
                        </span>
                      )}
                    </div>
                    {ip.planDescription && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {ip.planDescription}
                      </p>
                    )}
                    {ip.servicesProvided && (
                      <div className="flex flex-wrap gap-1">
                        {ip.servicesProvided
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean)
                          .map((svc) => (
                            <span
                              key={svc}
                              className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                            >
                              {svc}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </CardContent>
        )}
      </Card>
    );
  };

  // Compute printFilters for export
  const printFilters = [
    ...(categoryFilter !== "__any__" ? [{ label: "Category", value: categoryFilter }] : []),
    ...(statusFilter !== "__any__" ? [{ label: "Status", value: statusFilter }] : []),
    ...(residentFilter !== "__any__" ? [{ label: "Resident", value: residentLookup.get(Number(residentFilter))?.internalCode || residentLookup.get(Number(residentFilter))?.caseControlNo || residentFilter }] : []),
    ...(search.trim() ? [{ label: "Search", value: search.trim() }] : []),
  ];

  return (
    <DashboardLayout title="Case Conferences">
      <PrintReportHeader title="Case Conference Report" filters={printFilters} count={filteredPlans.length} />
      <div className="max-w-6xl space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" /> Case Conferences
          </h2>
          <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
            Internal team meetings to review resident cases and create forward-looking intervention plans. Plans are grouped by conference date.
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{stats.conferences}</p>
              <p className="text-xs text-muted-foreground">Conferences</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Plans</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-muted-foreground">{stats.open}</p>
              <p className="text-xs text-muted-foreground">Open</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-primary">{stats.inProgress}</p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-success">{stats.completed}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-warning">{stats.onHold}</p>
              <p className="text-xs text-muted-foreground">On Hold</p>
            </CardContent>
          </Card>
        </div>

        {/* Top bar: search + new button */}
        <div className="print:hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search resident, safehouse, description…"
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
              <Button size="sm" className="gap-2" onClick={openCreate}>
                <Plus className="w-4 h-4" /> New Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Edit Intervention Plan" : "New Intervention Plan"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label>Resident</Label>
                  <select
                    className="w-full border rounded-md h-10 px-3 bg-background"
                    value={form.residentId}
                    onChange={(e) =>
                      setForm({ ...form, residentId: Number(e.target.value) })
                    }
                  >
                    <option value={0}>Select a resident…</option>
                    {(residents ?? []).map((r) => (
                      <option key={r.residentId} value={r.residentId}>
                        {displayName(r)}{" "}
                        {r.safehouse ? `· ${r.safehouse.name}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Conference Date</Label>
                    <Input
                      type="date"
                      value={form.caseConferenceDate}
                      onChange={(e) =>
                        setForm({ ...form, caseConferenceDate: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <select
                      className="w-full border rounded-md h-10 px-3 bg-background"
                      value={form.planCategory}
                      onChange={(e) =>
                        setForm({ ...form, planCategory: e.target.value })
                      }
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Status</Label>
                    <select
                      className="w-full border rounded-md h-10 px-3 bg-background"
                      value={form.status}
                      onChange={(e) =>
                        setForm({ ...form, status: e.target.value })
                      }
                    >
                      {STATUSES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Target Date</Label>
                    <Input
                      type="date"
                      value={form.targetDate}
                      onChange={(e) =>
                        setForm({ ...form, targetDate: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label>Plan Description</Label>
                  <Textarea
                    rows={3}
                    value={form.planDescription}
                    onChange={(e) =>
                      setForm({ ...form, planDescription: e.target.value })
                    }
                    placeholder="What specific actions will be taken for this resident?"
                  />
                </div>
                <div>
                  <Label>Services Provided</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {SERVICES.map((svc) => {
                      const selected = (form.servicesProvided ?? "")
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean);
                      const active = selected.includes(svc);
                      return (
                        <button
                          key={svc}
                          type="button"
                          className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                            active
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background border-border hover:border-primary/50"
                          }`}
                          onClick={() => {
                            const next = active
                              ? selected.filter((s) => s !== svc)
                              : [...selected, svc];
                            setForm({
                              ...form,
                              servicesProvided: next.join(", "),
                            });
                          }}
                        >
                          {svc}
                        </button>
                      );
                    })}
                  </div>
                  <Input
                    className="mt-2"
                    value={form.servicesProvided}
                    onChange={(e) =>
                      setForm({ ...form, servicesProvided: e.target.value })
                    }
                    placeholder="Or type custom services, comma-separated"
                  />
                </div>
                <div>
                  <Label>Target Value</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.targetValue}
                    onChange={(e) =>
                      setForm({ ...form, targetValue: e.target.value })
                    }
                    placeholder="Optional numeric target"
                  />
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
                    : "Create Plan"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => window.print()}
          >
            <Printer className="w-4 h-4" /> Print Report
          </Button>
        </div>

        {/* Filter row */}
        <div className="print:hidden flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-medium">
              Category
            </label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Any category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__any__">Any category</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-medium">
              Status
            </label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Any status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__any__">Any status</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {hasFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearFilters}
            >
              Clear filters
            </Button>
          )}
          <span className="text-xs text-muted-foreground ml-auto self-end pb-1">
            {filteredPlans.length} of {plans?.length ?? 0} plan
            {(plans?.length ?? 0) === 1 ? "" : "s"}
          </span>
        </div>

        {/* Loading / empty states */}
        {isLoading && (
          <p className="text-muted-foreground text-sm">Loading…</p>
        )}
        {!isLoading && (plans?.length ?? 0) === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No intervention plans yet. Click "New Plan" to document a case
              conference outcome.
            </CardContent>
          </Card>
        )}
        {!isLoading &&
          (plans?.length ?? 0) > 0 &&
          filteredPlans.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No plans match the current filters.
              </CardContent>
            </Card>
          )}

        {/* Two-column layout: Upcoming | Past */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Upcoming column ── */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Upcoming Conferences
              <Badge variant="secondary" className="ml-1">
                {upcomingGroups.reduce((n, g) => n + g.plans.length, 0)}
              </Badge>
            </h3>
            {upcomingGroups.length === 0 && (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground text-sm">
                  No upcoming conferences scheduled.
                </CardContent>
              </Card>
            )}
            {upcomingGroups.map((group) => renderConferenceGroup(group))}
          </div>

          {/* ── Past column ── */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Past Conferences
              <Badge variant="secondary" className="ml-1">
                {pastGroups.reduce((n, g) => n + g.plans.length, 0)}
              </Badge>
            </h3>
            {pastGroups.length === 0 && (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground text-sm">
                  No past conferences recorded.
                </CardContent>
              </Card>
            )}
            {pastGroups.map((group) => renderConferenceGroup(group))}
          </div>
        </div>
      </div>

      {/* ── Detail sheet ── */}
      <Sheet
        open={sheetOpen}
        onOpenChange={(o) => {
          if (!o) setSelected(null);
        }}
      >
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Intervention Plan #{selected.planId}
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

              {/* Plan info */}
              <div className="divide-y">
                <DetailRow
                  label="Resident"
                  value={
                    detailResident
                      ? displayName(detailResident)
                      : `#${selected.residentId}`
                  }
                />
                <DetailRow
                  label="Safehouse"
                  value={detailResident?.safehouse?.name}
                />
                <DetailRow
                  label="Conference date"
                  value={fmtDate(selected.caseConferenceDate)}
                />
                <DetailRow
                  label="Category"
                  value={
                    <Badge className={categoryColor(selected.planCategory)}>
                      {selected.planCategory}
                    </Badge>
                  }
                />
                <DetailRow
                  label="Status"
                  value={
                    <Badge className={statusColor(selected.status)}>
                      {statusIcon(selected.status)}
                      <span className="ml-1">{selected.status}</span>
                    </Badge>
                  }
                />
              </div>

              <Separator className="my-4" />
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Plan Details
              </p>
              <div className="divide-y">
                <DetailRow
                  label="Description"
                  value={
                    selected.planDescription ? (
                      <span className="whitespace-pre-wrap">
                        {selected.planDescription}
                      </span>
                    ) : null
                  }
                />
                <DetailRow
                  label="Services"
                  value={
                    selected.servicesProvided ? (
                      <div className="flex flex-wrap gap-1">
                        {selected.servicesProvided
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean)
                          .map((svc) => (
                            <span
                              key={svc}
                              className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                            >
                              {svc}
                            </span>
                          ))}
                      </div>
                    ) : null
                  }
                />
                <DetailRow
                  label="Target date"
                  value={fmtDate(selected.targetDate)}
                />
                <DetailRow
                  label="Target value"
                  value={
                    selected.targetValue != null
                      ? String(selected.targetValue)
                      : null
                  }
                />
              </div>

              <Separator className="my-4" />
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Timestamps
              </p>
              <div className="divide-y">
                <DetailRow label="Created" value={fmtDate(selected.createdAt)} />
                <DetailRow label="Updated" value={fmtDate(selected.updatedAt)} />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
        title="Delete this intervention plan?"
        description="This will permanently remove the plan. This action cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={deleteMut.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMut.mutate(deleteTarget.planId);
        }}
      />

      <PrintTable
        columns={[
          { header: "Conf. Date", accessor: (r: InterventionPlanRow) => r.caseConferenceDate ? new Date(r.caseConferenceDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Unscheduled" },
          { header: "Resident", accessor: (r: InterventionPlanRow) => residentLookup.get(r.residentId) ? displayName(residentLookup.get(r.residentId)!) : `#${r.residentId}` },
          { header: "Category", accessor: (r: InterventionPlanRow) => r.planCategory ?? "" },
          { header: "Status", accessor: (r: InterventionPlanRow) => r.status ?? "" },
          { header: "Description", accessor: (r: InterventionPlanRow) => r.planDescription ?? "" },
          { header: "Services", accessor: (r: InterventionPlanRow) => r.servicesProvided ?? "" },
          { header: "Target Date", accessor: (r: InterventionPlanRow) => r.targetDate ? new Date(r.targetDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "" },
        ]}
        data={filteredPlans}
        keyAccessor={(r: InterventionPlanRow) => r.planId}
      />
    </DashboardLayout>
  );
};

export default CaseConferences;
