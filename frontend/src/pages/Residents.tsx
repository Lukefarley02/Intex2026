import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus, UserCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/api/client";

// ---- Types matching /api/residents projection ----
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

const Residents = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(ANY);
  const [safehouseFilter, setSafehouseFilter] = useState<string>(ANY);
  const [priorityFilter, setPriorityFilter] = useState<string>(ANY);

  const { data, isLoading, isError } = useQuery<ResidentRow[]>({
    queryKey: ["residents"],
    queryFn: () => apiFetch<ResidentRow[]>("/api/residents"),
  });

  const residents = data ?? [];

  // Unique list of safehouse names present in the data set, for the
  // safehouse dropdown. Sorted alphabetically so the menu is predictable.
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
        <Button variant="hero" size="sm">
          <Plus className="w-4 h-4 mr-1" /> Add resident
        </Button>
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
    </DashboardLayout>
  );
};

export default Residents;
