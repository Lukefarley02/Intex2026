import { useMemo } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/api/client";
import { useAuth } from "@/api/AuthContext";
import {
  UserCircle,
  Home,
  MapPin,
  Calendar,
  NotebookPen,
  ClipboardList,
  Users,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";

// ---- Types (match existing API projections) ----

interface MeResponse {
  email: string;
  roles: string[];
  region: string | null;
  city: string | null;
  adminScope: string | null;
}

interface SafehouseRow {
  safehouseId: number;
  safehouseCode: string | null;
  name: string;
  region: string | null;
  province: string | null;
  city: string | null;
  country: string | null;
  status: string | null;
  openDate: string | null;
  capacityGirls: number | null;
  capacityStaff: number | null;
  storedOccupancy: number | null;
  activeResidents: number;
}

interface ResidentRow {
  residentId: number;
  safehouseId: number;
  caseControlNo: string | null;
  internalCode: string | null;
  caseStatus: string | null;
  currentRiskLevel: string | null;
  // ResidentsController projects a minimal safehouse navigation alongside
  // each resident — used as a last-resort fallback if /api/safehouses/mine
  // and /api/safehouses both come back empty.
  safehouse: { name: string; city: string | null; region: string | null } | null;
}

interface HomeVisitationRow {
  visitationId: number;
  residentId: number;
  visitDate: string | null;
  visitType: string | null;
  purpose: string | null;
  locationVisited: string | null;
  visitOutcome: string | null;
  socialWorker: string | null;
}

interface ProcessRecordingRow {
  recordingId: number;
  residentId: number;
  sessionDate: string | null;
  sessionType: string | null;
  sessionDurationMinutes: number | null;
  progressNoted: string | null;
  socialWorker: string | null;
}

// ---- Normalized "event" type so we can merge multiple feeds into one list ----
type EventKind = "home-visit" | "case-conference" | "counseling" | "weekly-check-in";

interface StaffEvent {
  id: string;
  kind: EventKind;
  date: Date | null;
  title: string;
  subtitle: string;
  residentId: number;
  socialWorker: string | null;
}

const fmtDate = (d: Date | null) =>
  d
    ? d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

// Home visitations have `visit_type` free-text; anything that mentions a
// conference is routed to the "case-conference" bucket so the dashboard can
// show it as its own pillar. Everything else is a regular field visit.
const classifyVisit = (visitType: string | null): EventKind => {
  const v = (visitType ?? "").toLowerCase();
  if (v.includes("conference") || v.includes("review")) return "case-conference";
  return "home-visit";
};

// Process recordings are "counseling sessions" in the case-management
// vocabulary. The schema has an optional session_type; if the staff member
// logged it as a "weekly check-in" we promote it into its own bucket so the
// old StaffPortal weekly check-in UX still has a home on the dashboard.
const classifyRecording = (sessionType: string | null): EventKind => {
  const s = (sessionType ?? "").toLowerCase();
  if (s.includes("weekly") || s.includes("check")) return "weekly-check-in";
  return "counseling";
};

const kindMeta: Record<
  EventKind,
  { label: string; icon: typeof Calendar; badgeClass: string }
> = {
  "home-visit": {
    label: "Home visit",
    icon: MapPin,
    badgeClass: "bg-secondary/10 text-secondary border-secondary/20",
  },
  "case-conference": {
    label: "Case conference",
    icon: Users,
    badgeClass: "bg-gold/10 text-gold border-gold/20",
  },
  counseling: {
    label: "Counseling",
    icon: NotebookPen,
    badgeClass: "bg-primary/10 text-primary border-primary/20",
  },
  "weekly-check-in": {
    label: "Weekly check-in",
    icon: ClipboardList,
    badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
};

const StaffDashboard = () => {
  const { user } = useAuth();

  // Profile block (region, city, admin scope).
  const { data: me } = useQuery<MeResponse>({
    queryKey: ["auth-me"],
    queryFn: () => apiFetch<MeResponse>("/api/auth/me"),
    retry: false,
  });

  // Fetch the caller's safehouse(s) with a three-step graceful degradation
  // so the card always shows something useful:
  //
  //   1. /api/safehouses/mine — new endpoint with built-in fallback passes
  //      (city-scope → residents-join → region-wide).
  //   2. /api/safehouses      — the plain list endpoint. If the backend
  //      hasn't been redeployed with `mine` yet this is the normal source.
  //   3. Derived from /api/residents — if both of the above return empty,
  //      the ResidentsController projection still embeds a minimal
  //      `{ name, city, region }` navigation on each resident, so we can
  //      reconstruct a "best effort" card with just the name and location.
  //
  // Any 404 on /mine (older backend) is swallowed and we fall through to
  // the list endpoint automatically.
  const { data: safehouses = [], isLoading: shLoading } = useQuery<SafehouseRow[]>({
    queryKey: ["safehouses-mine"],
    queryFn: async () => {
      // Try /mine first.
      try {
        const mine = await apiFetch<SafehouseRow[]>("/api/safehouses/mine");
        if (mine.length > 0) return mine;
      } catch {
        // Older backend that doesn't know about /mine — fall through.
      }
      // Fall back to the full list endpoint (already scoped by the
      // SafehousesController for non-Admin callers).
      try {
        return await apiFetch<SafehouseRow[]>("/api/safehouses");
      } catch {
        return [];
      }
    },
    retry: false,
  });

  // Residents in that same scope — used to build a name map for the event
  // feed so we can render "Resident #7" as a case control number instead.
  const { data: residents = [] } = useQuery<ResidentRow[]>({
    queryKey: ["residents"],
    queryFn: () => apiFetch<ResidentRow[]>("/api/residents"),
  });

  const { data: visits = [] } = useQuery<HomeVisitationRow[]>({
    queryKey: ["home-visitations"],
    queryFn: () => apiFetch<HomeVisitationRow[]>("/api/homevisitations"),
  });

  const { data: recordings = [] } = useQuery<ProcessRecordingRow[]>({
    queryKey: ["process-recordings"],
    queryFn: () => apiFetch<ProcessRecordingRow[]>("/api/processrecordings"),
  });

  // Build a lookup from residentId → display name so both feeds can
  // identify the girl without exposing restricted fields.
  const residentLabel = useMemo(() => {
    const map = new Map<number, string>();
    for (const r of residents) {
      const label =
        r.internalCode || r.caseControlNo || `Resident #${r.residentId}`;
      map.set(r.residentId, label);
    }
    return map;
  }, [residents]);

  // Merge home visits + counseling sessions into a single normalized event
  // feed sorted by date. This is the core of the dashboard.
  const events: StaffEvent[] = useMemo(() => {
    const fromVisits = visits.map<StaffEvent>((v) => {
      const kind = classifyVisit(v.visitType);
      const date = v.visitDate ? new Date(v.visitDate) : null;
      return {
        id: `v-${v.visitationId}`,
        kind,
        date,
        title:
          v.purpose ||
          v.visitType ||
          (kind === "case-conference" ? "Case conference" : "Home visit"),
        subtitle:
          residentLabel.get(v.residentId) ?? `Resident #${v.residentId}`,
        residentId: v.residentId,
        socialWorker: v.socialWorker,
      };
    });

    const fromRecordings = recordings.map<StaffEvent>((p) => {
      const kind = classifyRecording(p.sessionType);
      const date = p.sessionDate ? new Date(p.sessionDate) : null;
      return {
        id: `p-${p.recordingId}`,
        kind,
        date,
        title:
          p.sessionType ||
          (kind === "weekly-check-in" ? "Weekly check-in" : "Counseling session"),
        subtitle:
          residentLabel.get(p.residentId) ?? `Resident #${p.residentId}`,
        residentId: p.residentId,
        socialWorker: p.socialWorker,
      };
    });

    return [...fromVisits, ...fromRecordings].sort((a, b) => {
      const aT = a.date ? a.date.getTime() : 0;
      const bT = b.date ? b.date.getTime() : 0;
      return bT - aT; // newest first
    });
  }, [visits, recordings, residentLabel]);

  const now = Date.now();
  const upcoming = events
    .filter((e) => e.date && e.date.getTime() > now)
    .sort((a, b) => (a.date!.getTime() - b.date!.getTime())) // soonest first
    .slice(0, 8);
  const history = events
    .filter((e) => !e.date || e.date.getTime() <= now)
    .slice(0, 10);

  // Quick tallies for the "this month" chips on the profile card.
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const thisMonthCount = (kind: EventKind) =>
    events.filter(
      (e) => e.kind === kind && e.date && e.date.getTime() >= monthStart.getTime()
    ).length;

  // Last-resort fallback: if neither /api/safehouses/mine nor
  // /api/safehouses returned anything but we have residents, synthesize a
  // minimal safehouse card from the embedded safehouse nav on those
  // residents. Capacity/code/status are unknown at that point, so we leave
  // them null and the card's "—" placeholders handle it gracefully.
  const derivedSafehouses: SafehouseRow[] = useMemo(() => {
    if (safehouses.length > 0) return safehouses;
    const map = new Map<string, SafehouseRow>();
    for (const r of residents) {
      if (!r.safehouse || !r.safehouse.name) continue;
      const key = r.safehouse.name;
      const isActive = r.caseStatus === "Active";
      const existing = map.get(key);
      if (existing) {
        if (isActive) existing.activeResidents += 1;
      } else {
        map.set(key, {
          safehouseId: r.safehouseId,
          safehouseCode: null,
          name: r.safehouse.name,
          region: r.safehouse.region,
          province: null,
          city: r.safehouse.city,
          country: null,
          status: null,
          openDate: null,
          capacityGirls: null,
          capacityStaff: null,
          storedOccupancy: null,
          activeResidents: isActive ? 1 : 0,
        });
      }
    }
    return Array.from(map.values());
  }, [safehouses, residents]);

  const primarySafehouse = derivedSafehouses[0] ?? null;

  return (
    <DashboardLayout title="Staff Dashboard">
      {/* Greeting */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold">
          Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}.
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Your assigned safehouse, upcoming visits, and recent case notes in one place.
        </p>
      </div>

      {/* Top row: profile + safehouse */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Profile card */}
        <Card className="rounded-xl shadow-sm lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserCircle className="w-4 h-4 text-primary" /> My account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium text-right break-all">
                {user?.email ?? "—"}
              </span>
            </div>
            <div className="flex items-start justify-between gap-2">
              <span className="text-muted-foreground">Role</span>
              <span className="font-medium text-right">
                {user?.roles.includes("Admin")
                  ? "Administrator"
                  : user?.roles.includes("Staff")
                    ? "Staff — Case Worker"
                    : user?.roles[0] ?? "—"}
              </span>
            </div>
            <div className="flex items-start justify-between gap-2">
              <span className="text-muted-foreground">Region</span>
              <span className="font-medium text-right">{me?.region ?? "—"}</span>
            </div>
            <div className="flex items-start justify-between gap-2">
              <span className="text-muted-foreground">City</span>
              <span className="font-medium text-right">{me?.city ?? "—"}</span>
            </div>

            <div className="pt-3 border-t space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                This month
              </p>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className={kindMeta["home-visit"].badgeClass}>
                  {thisMonthCount("home-visit")} visits
                </Badge>
                <Badge variant="outline" className={kindMeta["counseling"].badgeClass}>
                  {thisMonthCount("counseling")} counseling
                </Badge>
                <Badge variant="outline" className={kindMeta["weekly-check-in"].badgeClass}>
                  {thisMonthCount("weekly-check-in")} check-ins
                </Badge>
                <Badge variant="outline" className={kindMeta["case-conference"].badgeClass}>
                  {thisMonthCount("case-conference")} conferences
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Safehouse card (replaces the old /safehouses page for Staff) */}
        <Card className="rounded-xl shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Home className="w-4 h-4 text-primary" /> My safehouse
            </CardTitle>
          </CardHeader>
          <CardContent>
            {shLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : !primarySafehouse ? (
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  No safehouse is currently assigned to your account.
                </p>
                <p className="text-xs">
                  Your scope is {me?.region || "—"}
                  {me?.city ? ` / ${me.city}` : ""}. Ask a Founder or Regional
                  Manager to set your Region and City so your safehouse shows up
                  here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {primarySafehouse.name}
                    </h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {[
                        primarySafehouse.city,
                        primarySafehouse.province,
                        primarySafehouse.region,
                        primarySafehouse.country,
                      ]
                        .filter(Boolean)
                        .join(", ") || "Location unavailable"}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      primarySafehouse.status === "Active"
                        ? "bg-success/10 text-success border-success/20"
                        : "bg-muted text-muted-foreground"
                    }
                  >
                    {primarySafehouse.status ?? "Unknown"}
                  </Badge>
                </div>

                {/* Occupancy */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-muted-foreground">Occupancy</span>
                    <span className="font-medium">
                      {primarySafehouse.activeResidents} /{" "}
                      {primarySafehouse.capacityGirls ?? "—"} girls
                    </span>
                  </div>
                  <Progress
                    value={
                      primarySafehouse.capacityGirls
                        ? Math.min(
                            100,
                            (primarySafehouse.activeResidents /
                              primarySafehouse.capacityGirls) *
                              100
                          )
                        : 0
                    }
                  />
                </div>

                <div className="grid grid-cols-3 gap-3 pt-3 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">Code</p>
                    <p className="text-sm font-medium">
                      {primarySafehouse.safehouseCode ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Staff capacity</p>
                    <p className="text-sm font-medium">
                      {primarySafehouse.capacityStaff ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Opened</p>
                    <p className="text-sm font-medium">
                      {primarySafehouse.openDate
                        ? new Date(primarySafehouse.openDate).toLocaleDateString()
                        : "—"}
                    </p>
                  </div>
                </div>

                {/* If a Staff account somehow gets mapped to more than one
                    safehouse (e.g. covering two cities), list the others below. */}
                {derivedSafehouses.length > 1 && (
                  <div className="pt-3 border-t space-y-1.5">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Also covering
                    </p>
                    {derivedSafehouses.slice(1).map((s) => (
                      <div
                        key={s.safehouseId}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>{s.name}</span>
                        <span className="text-muted-foreground">
                          {s.activeResidents}/{s.capacityGirls ?? "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Events: upcoming + history */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" /> Upcoming
            </CardTitle>
            <Link
              to="/home-visitation"
              className="text-xs font-medium text-primary hover:underline"
            >
              Schedule visit →
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing scheduled. Use Home Visitation or Process Recording to add
                an upcoming session.
              </p>
            ) : (
              upcoming.map((e) => {
                const meta = kindMeta[e.kind];
                const Icon = meta.icon;
                return (
                  <div
                    key={e.id}
                    className="flex items-start gap-3 p-3 rounded-lg border"
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary-light flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate">{e.title}</p>
                        <Badge variant="outline" className={meta.badgeClass}>
                          {meta.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {e.subtitle} · {fmtDate(e.date)}
                        {e.socialWorker ? ` · ${e.socialWorker}` : ""}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <NotebookPen className="w-4 h-4 text-primary" /> Recent history
            </CardTitle>
            <Link
              to="/process-recording"
              className="text-xs font-medium text-primary hover:underline"
            >
              All notes →
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No past visits or counseling sessions on record yet.
              </p>
            ) : (
              history.map((e) => {
                const meta = kindMeta[e.kind];
                const Icon = meta.icon;
                return (
                  <div
                    key={e.id}
                    className="flex items-start gap-3 p-3 rounded-lg border"
                  >
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate">{e.title}</p>
                        <Badge variant="outline" className={meta.badgeClass}>
                          {meta.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {e.subtitle} · {fmtDate(e.date)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { to: "/residents", label: "My residents", icon: UserCircle },
          { to: "/process-recording", label: "Process recording", icon: NotebookPen },
          { to: "/home-visitation", label: "Home visitation", icon: MapPin },
        ].map((q) => (
          <Link key={q.to} to={q.to}>
            <Card className="rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <q.icon className="w-5 h-5 text-primary" />
                  <span className="font-semibold">{q.label}</span>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Tiny footer nudge about the old weekly check-in form */}
      <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1.5">
        <AlertTriangle className="w-3 h-3" />
        Weekly check-ins are now logged as a <strong>Process Recording</strong>{" "}
        with session type &ldquo;Weekly check-in&rdquo;.
      </p>
    </DashboardLayout>
  );
};

export default StaffDashboard;
