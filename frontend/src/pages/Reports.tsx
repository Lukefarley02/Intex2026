import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BarChart3,
  TrendingUp,
  Users,
  Home as HomeIcon,
  HeartHandshake,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/api/client";

/**
 * Reports & Analytics page — wired to GET /api/reports/summary.
 *
 * Covers the four pillars the IS 413 rubric asks for:
 *   • donation trends over time
 *   • resident outcome metrics
 *   • safehouse performance comparisons
 *   • reintegration success rates
 * plus the Annual Accomplishment Report format (caring / healing / teaching)
 * used by Philippine social welfare agencies.
 *
 * Everything is live aggregation — no mock arrays. The window is a simple
 * start/end date pair the user can adjust; the default is the trailing 12
 * months matching the backend default.
 */

interface NamedCount {
  count: number;
}
interface StatusCount extends NamedCount {
  status: string;
}
interface CategoryCount extends NamedCount {
  category: string;
}
interface LabelCount extends NamedCount {
  label: string;
}
interface TypeCount extends NamedCount {
  type: string;
}

interface ReportsSummary {
  period: { start: string; end: string };
  staffView: boolean;
  caring: {
    residentsServed: number;
    activeResidents: number;
    totalClosed: number;
    caseStatusBreakdown: StatusCount[];
    caseCategoryBreakdown: CategoryCount[];
    subCategoryBreakdown: LabelCount[];
  };
  healing: {
    counselingSessions: number;
    homeVisits: number;
    riskImproved: number;
  };
  reintegration: {
    totalClosed: number;
    reintegratedSuccess: number;
    reintegrationRate: number;
    reintegrationTypes: TypeCount[];
  };
  safehousePerformance: Array<{
    safehouseId: number;
    name: string;
    city: string | null;
    region: string | null;
    capacity: number;
    active: number;
    closedInWindow: number;
    totalServed: number;
    utilization: number;
  }>;
  donations: {
    total: number;
    count: number;
    trend: Array<{ month: string; total: number; count: number }>;
    byType: Array<{ type: string; total: number; hours?: number | null; count: number }>;
    byCampaign: Array<{ campaign: string; total: number; count: number }>;
    bySafehouse: Array<{
      safehouseId: number;
      name: string;
      share: number;
      allocated: number;
    }>;
  };
  annualAccomplishment: {
    caring: { girlsServed: number; activeNow: number; closedInWindow: number };
    healing: {
      counselingSessions: number;
      homeVisits: number;
      riskImproved: number;
    };
    teaching: {
      successfulReintegrations: number;
      reintegrationRate: number;
    };
  };
}

const fmtMoney = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n || 0);

const fmtPct = (n: number) => `${Math.round((n || 0) * 100)}%`;

/** Default date window: trailing 12 months ending today. */
function defaultWindow() {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 12);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end) };
}

const Reports = () => {
  const [range, setRange] = useState(() => defaultWindow());

  const { data, isLoading, isError, error } = useQuery<ReportsSummary>({
    queryKey: ["reports-summary", range.start, range.end],
    queryFn: () =>
      apiFetch<ReportsSummary>(
        `/api/reports/summary?start=${range.start}&end=${range.end}`
      ),
  });

  // Peak month in the donation trend so we can render a simple inline bar
  // chart without pulling in a chart library.
  const trendMax = useMemo(() => {
    if (!data?.donations.trend?.length) return 0;
    return Math.max(...data.donations.trend.map((t) => t.total));
  }, [data]);

  return (
    <DashboardLayout title="Reports & Analytics">
      {/* Period picker */}
      <Card className="rounded-xl shadow-sm mb-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Reporting period
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <Label>Start date</Label>
              <Input
                type="date"
                value={range.start}
                onChange={(e) => setRange({ ...range, start: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>End date</Label>
              <Input
                type="date"
                value={range.end}
                onChange={(e) => setRange({ ...range, end: e.target.value })}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              All numbers below are aggregated live from Azure SQL for the
              selected period and the records you are authorized to view.
            </p>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading report…</p>
      )}
      {isError && (
        <p className="text-sm text-destructive">
          Failed to load report: {(error as Error)?.message ?? "unknown error"}
        </p>
      )}

      {data && (
        <div className="space-y-6">
          {/* Annual Accomplishment Report header */}
          <Card className="rounded-xl shadow-sm border-primary/20">
            <CardHeader>
              <CardTitle className="text-base">
                Annual Accomplishment Report (Caring · Healing · Teaching)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-primary-light">
                  <div className="flex items-center gap-2 text-primary font-semibold">
                    <HeartHandshake className="w-4 h-4" /> Caring
                  </div>
                  <p className="text-2xl font-extrabold mt-2">
                    {data.annualAccomplishment.caring.girlsServed}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    girls served in period
                  </p>
                  <p className="text-xs mt-2">
                    Active now: <b>{data.annualAccomplishment.caring.activeNow}</b>
                    {" · "}Closed: <b>{data.annualAccomplishment.caring.closedInWindow}</b>
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-secondary/10">
                  <div className="flex items-center gap-2 text-secondary font-semibold">
                    <ShieldCheck className="w-4 h-4" /> Healing
                  </div>
                  <p className="text-2xl font-extrabold mt-2">
                    {data.annualAccomplishment.healing.counselingSessions}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    counseling sessions logged
                  </p>
                  <p className="text-xs mt-2">
                    Home visits: <b>{data.annualAccomplishment.healing.homeVisits}</b>
                    {" · "}Risk improved: <b>{data.annualAccomplishment.healing.riskImproved}</b>
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-accent/20">
                  <div className="flex items-center gap-2 text-accent-foreground font-semibold">
                    <GraduationCap className="w-4 h-4" /> Teaching
                  </div>
                  <p className="text-2xl font-extrabold mt-2">
                    {data.annualAccomplishment.teaching.successfulReintegrations}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    successful reintegrations
                  </p>
                  <p className="text-xs mt-2">
                    Reintegration rate:{" "}
                    <b>{fmtPct(data.annualAccomplishment.teaching.reintegrationRate)}</b>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Donation trends */}
          {!data.staffView && (
            <Card className="rounded-xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" /> Donation trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Total raised</p>
                    <p className="text-2xl font-bold">{fmtMoney(data.donations.total)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Gifts received</p>
                    <p className="text-2xl font-bold">{data.donations.count}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Avg gift</p>
                    <p className="text-2xl font-bold">
                      {data.donations.count > 0
                        ? fmtMoney(data.donations.total / data.donations.count)
                        : fmtMoney(0)}
                    </p>
                  </div>
                </div>

                {/* Inline monthly bar chart */}
                <div className="space-y-1 overflow-x-auto">
                  {data.donations.trend.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No donations in this window.
                    </p>
                  )}
                  {data.donations.trend.map((t) => (
                    <div key={t.month} className="flex items-center gap-3 text-xs sm:text-sm">
                      <span className="w-16 text-muted-foreground flex-shrink-0">{t.month}</span>
                      <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{
                            width: `${(t.total / (trendMax || 1)) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="w-24 text-right tabular-nums flex-shrink-0">
                        {fmtMoney(t.total)}
                      </span>
                      <span className="w-10 text-right text-xs text-muted-foreground flex-shrink-0">
                        {t.count}
                      </span>
                    </div>
                  ))}
                </div>

                {/* By type + by campaign */}
                <div className="grid md:grid-cols-2 gap-6 mt-6">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">
                      By donation type
                    </p>
                    <div className="space-y-1 text-sm">
                      {data.donations.byType.map((r) => (
                        <div key={r.type} className="flex justify-between">
                          <span>{r.type}</span>
                          <span className="tabular-nums text-muted-foreground">
                            {r.hours != null
                              ? `${r.hours % 1 === 0 ? r.hours : r.hours.toFixed(1)} hrs`
                              : fmtMoney(r.total)}{" "}
                            · {r.count}
                          </span>
                        </div>
                      ))}
                      {data.donations.byType.length === 0 && (
                        <p className="text-muted-foreground">No data.</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">
                      Top campaigns
                    </p>
                    <div className="space-y-1 text-sm">
                      {data.donations.byCampaign.map((r) => (
                        <div key={r.campaign} className="flex justify-between">
                          <span className="truncate pr-2">{r.campaign}</span>
                          <span className="tabular-nums text-muted-foreground">
                            {fmtMoney(r.total)}
                          </span>
                        </div>
                      ))}
                      {data.donations.byCampaign.length === 0 && (
                        <p className="text-muted-foreground">No data.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Allocation across safehouses */}
                {data.donations.bySafehouse.length > 0 && (
                  <div className="mt-6">
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">
                      Allocation across safehouses (weighted by residents served)
                    </p>
                    <div className="space-y-1 text-sm">
                      {data.donations.bySafehouse.map((r) => (
                        <div key={r.safehouseId} className="flex items-center gap-3">
                          <span className="flex-1 truncate">{r.name}</span>
                          <div className="w-40 h-3 bg-muted rounded overflow-hidden">
                            <div
                              className="h-full bg-secondary"
                              style={{ width: `${Math.round(r.share * 100)}%` }}
                            />
                          </div>
                          <span className="w-24 text-right tabular-nums">
                            {fmtMoney(r.allocated)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Safehouse performance */}
          <Card className="rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <HomeIcon className="w-4 h-4 text-primary" /> Safehouse performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground uppercase">
                      <th className="py-2">Safehouse</th>
                      <th className="py-2">Location</th>
                      <th className="py-2 text-right">Capacity</th>
                      <th className="py-2 text-right">Active</th>
                      <th className="py-2 text-right">Served (period)</th>
                      <th className="py-2 text-right">Closed (period)</th>
                      <th className="py-2 text-right">Utilization</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.safehousePerformance.map((sh) => (
                      <tr key={sh.safehouseId} className="border-t">
                        <td className="py-2 font-medium">{sh.name}</td>
                        <td className="py-2 text-muted-foreground">
                          {[sh.city, sh.region].filter(Boolean).join(", ") || "—"}
                        </td>
                        <td className="py-2 text-right tabular-nums">{sh.capacity}</td>
                        <td className="py-2 text-right tabular-nums">{sh.active}</td>
                        <td className="py-2 text-right tabular-nums">{sh.totalServed}</td>
                        <td className="py-2 text-right tabular-nums">{sh.closedInWindow}</td>
                        <td className="py-2 text-right">
                          <Badge
                            variant="outline"
                            className={
                              sh.utilization >= 0.9
                                ? "bg-destructive/10 text-destructive border-destructive/20"
                                : sh.utilization >= 0.6
                                  ? "bg-success/10 text-success border-success/20"
                                  : ""
                            }
                          >
                            {fmtPct(sh.utilization)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {data.safehousePerformance.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-4 text-muted-foreground">
                          No safehouses in scope.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Resident outcomes + reintegration */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="rounded-xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> Resident outcomes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">
                    Case status
                  </p>
                  <div className="space-y-1 text-sm">
                    {data.caring.caseStatusBreakdown.map((r) => (
                      <div key={r.status} className="flex justify-between">
                        <span>{r.status}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {r.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">
                    Case category
                  </p>
                  <div className="space-y-1 text-sm">
                    {data.caring.caseCategoryBreakdown.map((r) => (
                      <div key={r.category} className="flex justify-between">
                        <span className="truncate pr-2">{r.category}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {r.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {data.caring.subCategoryBreakdown.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">
                      Sub-categories
                    </p>
                    <div className="space-y-1 text-sm">
                      {data.caring.subCategoryBreakdown.map((r) => (
                        <div key={r.label} className="flex justify-between">
                          <span>{r.label}</span>
                          <span className="tabular-nums text-muted-foreground">
                            {r.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-secondary" /> Reintegration
                  success
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Closed</p>
                    <p className="text-2xl font-bold">
                      {data.reintegration.totalClosed}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Successful</p>
                    <p className="text-2xl font-bold text-success">
                      {data.reintegration.reintegratedSuccess}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Rate</p>
                    <p className="text-2xl font-bold">
                      {fmtPct(data.reintegration.reintegrationRate)}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">
                    Reintegration type
                  </p>
                  <div className="space-y-1 text-sm">
                    {data.reintegration.reintegrationTypes.map((r) => (
                      <div key={r.type} className="flex justify-between">
                        <span>{r.type}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {r.count}
                        </span>
                      </div>
                    ))}
                    {data.reintegration.reintegrationTypes.length === 0 && (
                      <p className="text-muted-foreground">
                        No closed cases in this window.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Reports;
