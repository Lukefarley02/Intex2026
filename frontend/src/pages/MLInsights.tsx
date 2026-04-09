import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/api/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  AlertTriangle,
  ArrowUpCircle,
  Globe,
  CheckCircle2,
  Building2,
  TrendingUp,
  Users,
  Heart,
  Package,
  Handshake,
  Lightbulb,
  ChevronRight,
  Info,
  Brain,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

// ─── Ember palette for charts ───────────────────────────────────────────────
const COLORS = {
  primary: "#E8641A",
  secondary: "#0D4C5E",
  gold: "#C4A24B",
  green: "#10B981",
  red: "#EF4444",
  amber: "#F59E0B",
  muted: "#9CA3AF",
};

const PIE_COLORS = [COLORS.primary, COLORS.secondary, COLORS.gold, COLORS.green, COLORS.red, COLORS.amber];

// ─── Pipeline definitions ────────────────────────────────────────────────────
const PIPELINES = [
  {
    id: "churn",
    number: "01",
    label: "Donor Turnover",
    shortLabel: "Turnover",
    icon: AlertTriangle,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-800",
    badgeBg: "bg-red-100/80 dark:bg-red-900/40",
    description: "Which donors are at risk of lapsing? Predicts churn using recency, frequency, and donation history.",
    modelType: "Classification · Gradient Boosting",
    dataSource: "supporters + donations tables",
  },
  {
    id: "capacity",
    number: "02",
    label: "Donor Improvement",
    shortLabel: "Improvement",
    icon: ArrowUpCircle,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    badgeBg: "bg-amber-100/80 dark:bg-amber-900/40",
    description: "Which donors have untapped giving potential? Tiers donors and identifies headroom for major gift asks.",
    modelType: "Regression · Random Forest",
    dataSource: "supporters + donations tables",
  },
  {
    id: "social",
    number: "03",
    label: "Social Media Donation Influence",
    shortLabel: "Social",
    icon: Globe,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
    badgeBg: "bg-blue-100/80 dark:bg-blue-900/40",
    description: "What content drives donations? Analyzes post characteristics vs. donation conversion.",
    modelType: "Regression · Gradient Boosting",
    dataSource: "social_media_posts table",
  },
  {
    id: "outcomes",
    number: "04",
    label: "Resident Outcomes",
    shortLabel: "Residents",
    icon: Heart,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800",
    badgeBg: "bg-emerald-100/80 dark:bg-emerald-900/40",
    description: "Which residents are progressing toward reintegration? Risk-scores each resident monthly.",
    modelType: "Classification · Gradient Boosting",
    dataSource: "residents + counseling + health + education records",
  },
  {
    id: "geographic",
    number: "05",
    label: "Safehouse Performance & Growth",
    shortLabel: "Performance",
    icon: Building2,
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-50 dark:bg-indigo-950/30",
    border: "border-indigo-200 dark:border-indigo-800",
    badgeBg: "bg-indigo-100/80 dark:bg-indigo-900/40",
    description: "Which safehouses are performing best? Benchmarks efficiency and flags capacity issues.",
    modelType: "Regression + Clustering",
    dataSource: "safehouses + residents tables",
  },
  {
    id: "roi",
    number: "06",
    label: "Channel ROI",
    shortLabel: "ROI",
    icon: TrendingUp,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-950/30",
    border: "border-violet-200 dark:border-violet-800",
    badgeBg: "bg-violet-100/80 dark:bg-violet-900/40",
    description: "Which acquisition channels deliver the highest lifetime-value donors?",
    modelType: "Regression · Gradient Boosting",
    dataSource: "supporters + donations tables",
  },
  // TODO Pipeline 07 (Partner Effectiveness) — commented out until CORS + data issues are resolved
  // {
  //   id: "partners",
  //   number: "07",
  //   label: "Partner Effectiveness",
  //   shortLabel: "Partners",
  //   icon: Handshake,
  //   color: "text-teal-600 dark:text-teal-400",
  //   bg: "bg-teal-50 dark:bg-teal-950/30",
  //   border: "border-teal-200 dark:border-teal-800",
  //   badgeBg: "bg-teal-100/80 dark:bg-teal-900/40",
  //   description: "Which partner types and program areas drive the best safehouse outcomes?",
  //   modelType: "Correlation + Random Forest",
  //   dataSource: "partners + assignments + metrics (run notebook for live data)",
  // },
  {
    id: "inkind",
    number: "08",
    label: "In-Kind Needs Forecast",
    shortLabel: "In-Kind",
    icon: Package,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950/30",
    border: "border-orange-200 dark:border-orange-800",
    badgeBg: "bg-orange-100/80 dark:bg-orange-900/40",
    description: "Are in-kind donations matching real needs? Forecasts monthly volumes and flags gaps.",
    modelType: "Time-series Forecasting · Random Forest",
    dataSource: "in_kind_donation_items (run notebook for live data)",
  },
] as const;

type PipelineId = (typeof PIPELINES)[number]["id"];

// ─── Shared helpers ──────────────────────────────────────────────────────────

const fmtCurrency = (n: number) => {
  if (n >= 1_000_000) return `₱${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₱${(n / 1_000).toFixed(1)}K`;
  return `₱${n.toFixed(0)}`;
};

const fmtPct = (n: number) => `${Math.round(n * 100)}%`;

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <Card className="rounded-xl shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <span className="text-sm text-muted-foreground">{label}</span>
          <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
        </div>
        <div className="text-3xl font-bold text-foreground">{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function InterpretationCard({ children }: { children: React.ReactNode }) {
  return (
    <Card className="rounded-xl border-secondary/20 bg-secondary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 text-secondary">
          <Lightbulb className="w-4 h-4" /> Interpretation
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-foreground/80 space-y-2">{children}</CardContent>
    </Card>
  );
}

function ActionsCard({ actions }: { actions: string[] }) {
  return (
    <Card className="rounded-xl border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 text-primary">
          <ChevronRight className="w-4 h-4" /> Suggested Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-2">
          {actions.map((a, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <span className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              <span className="text-foreground/80">{a}</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function RiskBadge({ level }: { level: string }) {
  const l = level?.toLowerCase();
  const cls =
    l === "critical"
      ? "bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800"
      : l === "high"
      ? "bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800"
      : l === "medium"
      ? "bg-yellow-100 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800"
      : l === "low"
      ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
      : "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {level}
    </span>
  );
}

function UtilBar({ pct }: { pct: number }) {
  const color =
    pct >= 0.9 ? "bg-red-500" : pct < 0.5 ? "bg-amber-400" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(pct * 100, 100)}%` }} />
      </div>
      <span className="text-xs text-muted-foreground w-9 text-right">{Math.round(pct * 100)}%</span>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} className="rounded-xl">
            <CardContent className="p-5">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="rounded-xl"><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
        <Card className="rounded-xl"><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
      </div>
    </div>
  );
}

// ─── Pipeline view components ────────────────────────────────────────────────

function DonorChurnView() {
  const { data, isLoading } = useQuery({
    queryKey: ["ml-churn"],
    queryFn: () => apiFetch<any>("/api/mlinsights/donor-churn"),
  });
  if (isLoading) return <LoadingSkeleton />;

  const buckets = data?.recencyBuckets ?? [];
  const topAtRisk = data?.topAtRiskDonors ?? [];

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Retention Rate" value={data ? fmtPct(data.retentionRate) : "—"} sub="Rolling 12-month" icon={TrendingUp} iconBg="bg-emerald-100" iconColor="text-emerald-600" />
        <KpiCard label="At-Risk Donors" value={data?.atRiskCount ?? "—"} sub="No gift in 90+ days" icon={AlertTriangle} iconBg="bg-red-100" iconColor="text-red-600" />
        <KpiCard label="Lapsed Donors" value={data?.lapsedCount ?? "—"} sub="No gift in 180+ days" icon={Users} iconBg="bg-orange-100" iconColor="text-orange-600" />
        <KpiCard label="Industry Avg" value="45%" sub="Sector retention benchmark" icon={Info} iconBg="bg-gray-100" iconColor="text-gray-500" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="rounded-xl shadow-sm">
          <CardHeader><CardTitle className="text-base">Donor Recency Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={buckets} margin={{ left: -10 }}>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`${v} donors`, "Count"]} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {buckets.map((_: any, i: number) => (
                    <Cell key={i} fill={i >= 3 ? COLORS.red : i === 2 ? COLORS.amber : COLORS.green} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground text-center mt-1">
              <span className="inline-block w-3 h-3 rounded-sm bg-emerald-500 mr-1" />Active
              <span className="inline-block w-3 h-3 rounded-sm bg-amber-400 ml-3 mr-1" />Watch
              <span className="inline-block w-3 h-3 rounded-sm bg-red-500 ml-3 mr-1" />At-Risk
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader><CardTitle className="text-base">Top At-Risk Donors (by Lifetime Value)</CardTitle></CardHeader>
          <CardContent>
            {topAtRisk.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No at-risk donors detected.</p>
            ) : (
              <div className="overflow-auto max-h-52">
                <table className="w-full text-xs">
                  <thead><tr className="border-b text-muted-foreground"><th className="text-left py-1">Donor</th><th className="text-right">Days</th><th className="text-right">LTV</th><th className="text-left pl-3">Channel</th></tr></thead>
                  <tbody>
                    {topAtRisk.map((d: any) => (
                      <tr key={d.supporterId} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-1.5 font-medium truncate max-w-[120px]">{d.name}</td>
                        <td className="text-right"><RiskBadge level={d.daysSinceLastGift > 180 ? "Critical" : d.daysSinceLastGift > 90 ? "High" : "Medium"} /></td>
                        <td className="text-right">{fmtCurrency(Number(d.lifetimeDonated))}</td>
                        <td className="pl-3 text-muted-foreground">{d.channel ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {(() => {
        const retentionRate = data?.retentionRate ?? 0;
        const atRiskCount = data?.atRiskCount ?? 0;
        const lapsedCount = data?.lapsedCount ?? 0;
        const topDonor = topAtRisk[0];

        const retentionStatus = retentionRate >= 0.6
          ? `Your ${fmtPct(retentionRate)} retention rate is above the 45% industry benchmark — strong engagement health.`
          : retentionRate >= 0.45
          ? `Your ${fmtPct(retentionRate)} retention rate is near the 45% industry average. Targeted campaigns could push this above 60%.`
          : `Your ${fmtPct(retentionRate)} retention rate is below the 45% industry benchmark — this gap requires urgent action. Every 1% improvement adds 5–10% to annual revenue.`;

        const atRiskStatement = atRiskCount === 0
          ? "No donors are currently at churn risk — excellent recency health across your base."
          : atRiskCount <= 5
          ? `${atRiskCount} donor${atRiskCount === 1 ? " is" : "s are"} entering the at-risk zone (90+ days since last gift). Act now before they lapse further.`
          : `${atRiskCount} donors haven't given in 90+ days — a significant portion of your base needs re-engagement before they become permanently lapsed.`;

        const topDonorNote = topDonor
          ? `Your highest-value at-risk donor, ${topDonor.name}, has contributed ${fmtCurrency(Number(topDonor.lifetimeDonated))} lifetime. A personal call from leadership today could recover this relationship.`
          : "";

        const actions: string[] = atRiskCount === 0
          ? [
              "Maintain momentum — send a quarterly impact update to all donors to keep engagement high.",
              "Set up a 60-day automated 'thank you + impact' trigger for all new donors before they slip to at-risk.",
              "Celebrate your strong retention internally — share the metric with the team as a KPI win.",
            ]
          : [
              atRiskCount > 10
                ? `URGENT: ${atRiskCount} donors are at churn risk — launch a re-engagement campaign this week with a personal impact story.`
                : `Send a personalized re-engagement email to all ${atRiskCount} at-risk donors this week — include a specific, recent impact story.`,
              topDonor
                ? `Call ${topDonor.name} personally — they've contributed ${fmtCurrency(Number(topDonor.lifetimeDonated))} and are your highest-value at-risk donor.`
                : "Personally call the top 5 at-risk donors sorted by lifetime value — executive-level outreach has the highest recovery rate.",
              "Set up an automated 60-day recency trigger in your CRM — intervene before donors reach the at-risk threshold.",
              lapsedCount > 0
                ? `${lapsedCount} donor${lapsedCount === 1 ? " has" : "s have"} been silent for 180+ days — send a 'We miss you' survey before making any ask.`
                : "Monitor the 90–180 day cohort closely — these donors are your best win-back opportunities.",
            ];

        return (
          <div className="grid lg:grid-cols-2 gap-6">
            <InterpretationCard>
              <p>{retentionStatus}</p>
              <p>{atRiskStatement}</p>
              {topDonorNote && <p>{topDonorNote}</p>}
            </InterpretationCard>
            <ActionsCard actions={actions} />
          </div>
        );
      })()}
    </div>
  );
}

function DonationCapacityView() {
  const { data, isLoading } = useQuery({
    queryKey: ["ml-capacity"],
    queryFn: () => apiFetch<any>("/api/mlinsights/donation-capacity"),
  });
  if (isLoading) return <LoadingSkeleton />;

  const tiers = data?.tierBreakdown ?? [];
  const upgrades = data?.upgradeOpportunities ?? [];
  const channels = data?.channelAvgDonation ?? [];

  const tierOrder = ["Starter", "Annual", "Mid-Level", "Major"];
  const sortedTiers = [...tiers].sort((a: any, b: any) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier));

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Major Donors" value={tiers.find((t: any) => t.tier === "Major")?.count ?? "0"} sub="Avg gift ≥ ₱50K" icon={ArrowUpCircle} iconBg="bg-amber-100" iconColor="text-amber-600" />
        <KpiCard label="Mid-Level Donors" value={tiers.find((t: any) => t.tier === "Mid-Level")?.count ?? "0"} sub="Avg gift ₱20K–₱50K" icon={TrendingUp} iconBg="bg-primary-light" iconColor="text-primary" />
        <KpiCard label="Upgrade Opportunities" value={data?.totalUpgradeOpportunities ?? "0"} sub="Headroom detected (max > 1.5× avg)" icon={Users} iconBg="bg-violet-100" iconColor="text-violet-600" />
        <KpiCard label="Top Channel LTV" value={channels[0]?.channel ?? "—"} sub={channels[0] ? fmtCurrency(Number(channels[0].avgDonation)) + " avg gift" : ""} icon={TrendingUp} iconBg="bg-emerald-100" iconColor="text-emerald-600" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="rounded-xl shadow-sm">
          <CardHeader><CardTitle className="text-base">Donor Capacity Tier Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={sortedTiers} dataKey="count" nameKey="tier" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3}>
                  {sortedTiers.map((_: any, i: number) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip formatter={(v: number, name: string) => [`${v} donors`, name]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader><CardTitle className="text-base">Upgrade Opportunities (Top 10)</CardTitle></CardHeader>
          <CardContent>
            {upgrades.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No recurring donors with detected headroom.</p>
            ) : (
              <div className="overflow-auto max-h-52">
                <table className="w-full text-xs">
                  <thead><tr className="border-b text-muted-foreground"><th className="text-left py-1">Donor</th><th className="text-right">Avg Gift</th><th className="text-right">Max Gift</th><th className="text-right">Headroom</th></tr></thead>
                  <tbody>
                    {upgrades.map((d: any) => (
                      <tr key={d.supporterId} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-1.5 font-medium truncate max-w-[120px]">{d.name}</td>
                        <td className="text-right">{fmtCurrency(Number(d.avgDonation))}</td>
                        <td className="text-right">{fmtCurrency(Number(d.maxDonation))}</td>
                        <td className="text-right font-semibold text-emerald-600">+{fmtCurrency(Number(d.headroom))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl shadow-sm">
        <CardHeader><CardTitle className="text-base">Average Donation by Acquisition Channel</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={channels} layout="vertical" margin={{ left: 80, right: 20 }}>
              <XAxis type="number" tickFormatter={(v) => fmtCurrency(v)} tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="channel" tick={{ fontSize: 11 }} width={80} />
              <Tooltip formatter={(v: number) => [fmtCurrency(v), "Avg Gift"]} />
              <Bar dataKey="avgDonation" fill={COLORS.secondary} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {(() => {
        const majorCount = tiers.find((t: any) => t.tier === "Major")?.count ?? 0;
        const midCount = tiers.find((t: any) => t.tier === "Mid-Level")?.count ?? 0;
        const upgradeCount = data?.totalUpgradeOpportunities ?? 0;
        const topChannel = channels[0];
        const bottomChannel = channels[channels.length - 1];
        const topUpgrader = upgrades[0];
        const totalHeadroom = upgrades.reduce((sum: number, d: any) => sum + Number(d.headroom), 0);

        const dominantTier = [...tiers].sort((a: any, b: any) => b.count - a.count)[0];

        const tierStatement = dominantTier
          ? dominantTier.tier === "Major"
            ? `Your base is dominated by ${dominantTier.count} Major donors (avg ≥ ₱50K) — strong major gift portfolio. Focus on stewardship to retain this tier.`
            : dominantTier.tier === "Starter"
            ? `Most of your donors (${dominantTier.count}) are in the Starter tier (avg < ₱5K). There's significant revenue potential in moving even a fraction into Annual or Mid-Level giving.`
            : `Your largest donor group is the ${dominantTier.tier} tier (${dominantTier.count} donors). This is your best upgrade opportunity pool.`
          : "Tier data is not yet available.";

        const upgradeStatement = upgradeCount === 0
          ? "No recurring donors with detectable headroom at this time — consider building recurring giving before the capacity model can identify gaps."
          : `${upgradeCount} recurring donor${upgradeCount === 1 ? "" : "s"} ${upgradeCount === 1 ? "shows" : "show"} giving capacity above their average.${totalHeadroom > 0 ? ` Conservative upgrade asks could unlock up to ${fmtCurrency(totalHeadroom)} in additional revenue.` : ""}`;

        const channelStatement = topChannel
          ? `${topChannel.channel} is your highest-LTV acquisition channel at ${fmtCurrency(Number(topChannel.avgDonation))} avg gift.${
              bottomChannel && bottomChannel.channel !== topChannel.channel
                ? ` ${bottomChannel.channel} produces the lowest avg gift (${fmtCurrency(Number(bottomChannel.avgDonation))}) — consider where to redirect that acquisition spend.`
                : ""
            }`
          : "";

        const actions: string[] = [
          majorCount > 0
            ? `You have ${majorCount} major donor${majorCount === 1 ? "" : "s"} — schedule personal stewardship meetings with each. Use their highest-ever gift as the anchor for any ask.`
            : "No major donors yet — build toward this tier by identifying Mid-Level donors with growth trends.",
          upgradeCount > 0
            ? topUpgrader
              ? `Start with ${topUpgrader.name}: their max gift was ${fmtCurrency(Number(topUpgrader.maxDonation))} but they average ${fmtCurrency(Number(topUpgrader.avgDonation))} — ask for a gift at their peak level.`
              : `Contact your ${upgradeCount} headroom donors this quarter — ask at their maximum historical gift level, not their average.`
            : "Focus on converting one-time donors to recurring — this is the first step toward capacity tier movement.",
          midCount > 0
            ? `Engage your ${midCount} Mid-Level donors (₱20K–₱50K avg) with a structured giving program — they are your most likely path to Major donor status.`
            : "Develop an Annual Giving program to move Starter donors into consistent mid-range giving.",
          topChannel
            ? `Prioritize ${topChannel.channel} for new donor acquisition — it delivers ${fmtCurrency(Number(topChannel.avgDonation))} avg per donor, your highest return.`
            : "Track acquisition channel on every new donor to enable future ROI analysis.",
        ];

        return (
          <div className="grid lg:grid-cols-2 gap-6">
            <InterpretationCard>
              <p>{tierStatement}</p>
              <p>{upgradeStatement}</p>
              {channelStatement && <p>{channelStatement}</p>}
            </InterpretationCard>
            <ActionsCard actions={actions} />
          </div>
        );
      })()}
    </div>
  );
}

function SocialMediaView() {
  const { data, isLoading } = useQuery({
    queryKey: ["social-stats"],
    queryFn: () => apiFetch<any>("/api/social/stats"),
  });
  if (isLoading) return <LoadingSkeleton />;

  const platforms = data?.platformBreakdown ?? [];
  const postTypes = data?.topPostTypes ?? [];

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Reach" value={data ? (data.totalReach >= 1000 ? `${(data.totalReach / 1000).toFixed(0)}K` : data.totalReach.toString()) : "—"} sub="All-time across platforms" icon={Globe} iconBg="bg-blue-100" iconColor="text-blue-600" />
        <KpiCard label="Avg Engagement" value={data ? `${(data.avgEngagementRate * 100).toFixed(1)}%` : "—"} sub="Likes + comments + shares / reach" icon={TrendingUp} iconBg="bg-primary-light" iconColor="text-primary" />
        <KpiCard label="Donation Referrals" value={data?.totalDonationReferrals?.toLocaleString() ?? "—"} sub="Posts linked to a donation" icon={ArrowUpCircle} iconBg="bg-emerald-100" iconColor="text-emerald-600" />
        <KpiCard label="Est. Donation Value" value={data ? fmtCurrency(Number(data.estimatedDonationValuePhp)) : "—"} sub="From social-referred donations" icon={TrendingUp} iconBg="bg-amber-100" iconColor="text-amber-600" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="rounded-xl shadow-sm">
          <CardHeader><CardTitle className="text-base">Reach by Platform</CardTitle></CardHeader>
          <CardContent>
            {platforms.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Social media table not yet seeded. Run the data import to populate.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={platforms} margin={{ left: -10 }}>
                  <XAxis dataKey="platform" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => [v.toLocaleString(), "Reach"]} />
                  <Bar dataKey="totalReach" fill={COLORS.secondary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader><CardTitle className="text-base">Top Post Types by Avg Donation Value</CardTitle></CardHeader>
          <CardContent>
            {postTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No post data available.</p>
            ) : (
              <div className="space-y-4 mt-2">
                {postTypes.map((pt: any, i: number) => (
                  <div key={pt.postType}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{pt.postType}</span>
                      <span className="text-muted-foreground">{fmtCurrency(Number(pt.avgDonationValue))} avg</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min((Number(pt.avgDonationValue) / Number(postTypes[0].avgDonationValue)) * 100, 100)}%`,
                          backgroundColor: PIE_COLORS[i],
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{pt.postCount} posts</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl shadow-sm">
        <CardHeader><CardTitle className="text-base">Platform Engagement Rate Comparison</CardTitle></CardHeader>
        <CardContent>
          {platforms.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No platform data available.</p>
          ) : (
            <div className="space-y-3">
              {[...platforms].sort((a: any, b: any) => b.avgEngagementRate - a.avgEngagementRate).map((p: any) => (
                <div key={p.platform}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{p.platform}</span>
                    <span className="text-muted-foreground">{(p.avgEngagementRate * 100).toFixed(1)}% engagement · {p.donationReferrals} referrals</span>
                  </div>
                  <UtilBar pct={Math.min(p.avgEngagementRate * 5, 1)} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {(() => {
        const noData = !data || data.totalPosts === 0;
        const topPlatformByReferrals = [...platforms].sort((a: any, b: any) => b.donationReferrals - a.donationReferrals)[0];
        const topPlatformByReach = platforms[0]; // already sorted by reach from backend
        const topPostType = postTypes[0];
        const avgEngRate = data?.avgEngagementRate ?? 0;
        const lowReferralHighReach = platforms.find(
          (p: any) => p.totalReach > (topPlatformByReach?.totalReach ?? 0) * 0.5 && p.donationReferrals === 0
        );

        const engagementStatement = noData
          ? "No social media data available yet — seed the social_media_posts table to unlock this analysis."
          : avgEngRate >= 0.1
          ? `Your average engagement rate of ${(avgEngRate * 100).toFixed(1)}% is healthy. However, engagement alone doesn't equal donations — conversion is what matters.`
          : avgEngRate >= 0.05
          ? `Your average engagement rate of ${(avgEngRate * 100).toFixed(1)}% is moderate. There may be a content-to-conversion gap — check whether posts include explicit donation CTAs.`
          : `Your average engagement rate of ${(avgEngRate * 100).toFixed(1)}% is low. Focus on storytelling content (impact stories, resident outcomes) which typically drives 3–5× higher engagement.`;

        const platformStatement = noData ? "" : topPlatformByReferrals
          ? topPlatformByReferrals.donationReferrals > 0
            ? `${topPlatformByReferrals.platform} is driving the most donation referrals (${topPlatformByReferrals.donationReferrals}) — this is your highest-converting platform.${
                topPlatformByReach && topPlatformByReach.platform !== topPlatformByReferrals.platform
                  ? ` ${topPlatformByReach.platform} has the most reach but fewer referrals — a CTA gap may exist there.`
                  : ""
              }`
            : "No platforms have generated donation referrals yet — every post needs a direct, visible donation link."
          : "";

        const postTypeStatement = noData ? "" : topPostType
          ? `${topPostType.postType} posts generate the highest average donation value at ${fmtCurrency(Number(topPostType.avgDonationValue))} per post — this should be your most frequent content type.`
          : "";

        const actions: string[] = noData
          ? [
              "Import or seed the social_media_posts.csv data into the database to enable live analysis.",
              "Begin tracking post metadata (type, tone, CTA, platform) consistently so the model can learn conversion patterns.",
            ]
          : [
              topPlatformByReferrals?.donationReferrals > 0
                ? `Double down on ${topPlatformByReferrals.platform} — it's converting reach into donations better than any other platform right now.`
                : "Add a direct donation link to every post immediately — no post should go live without a clear CTA.",
              topPostType
                ? `Create more ${topPostType.postType} content — it averages ${fmtCurrency(Number(topPostType.avgDonationValue))} per post in donation value. Target 2–3 per month.`
                : "Diversify post types and track which generate actual donations — not just likes.",
              lowReferralHighReach
                ? `${lowReferralHighReach.platform} has high reach but zero referrals — add a visible donate link or 'link in bio' to every post there.`
                : "Review your lowest-referral platforms and add donate links to all existing high-reach posts.",
              avgEngRate < 0.05
                ? "Engagement is low — introduce resident impact stories (anonymized) which typically drive 3–5× higher engagement than informational posts."
                : "Maintain your engagement momentum — test posting on Tuesday and Thursday afternoons for peak conversion windows.",
            ];

        return (
          <div className="grid lg:grid-cols-2 gap-6">
            <InterpretationCard>
              <p>{engagementStatement}</p>
              {platformStatement && <p>{platformStatement}</p>}
              {postTypeStatement && <p>{postTypeStatement}</p>}
            </InterpretationCard>
            <ActionsCard actions={actions} />
          </div>
        );
      })()}
    </div>
  );
}

function ResidentOutcomesView() {
  const { data, isLoading } = useQuery({
    queryKey: ["ml-outcomes"],
    queryFn: () => apiFetch<any>("/api/mlinsights/resident-outcomes"),
  });
  if (isLoading) return <LoadingSkeleton />;

  const readiness = data?.readinessTiers ?? [];
  const riskBreakdown = data?.riskBreakdown ?? [];
  const atRisk = data?.atRiskResidents ?? [];

  const readinessOrder = ["Ready", "Approaching", "In Progress", "At Risk"];
  const sortedReadiness = [...readiness].sort((a: any, b: any) =>
    readinessOrder.indexOf(a.tier) - readinessOrder.indexOf(b.tier)
  );

  const readinessColors: Record<string, string> = {
    Ready: COLORS.green,
    Approaching: COLORS.gold,
    "In Progress": COLORS.secondary,
    "At Risk": COLORS.red,
  };

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Active Residents" value={data?.activeCount ?? "—"} sub="Currently in the program" icon={Heart} iconBg="bg-emerald-100" iconColor="text-emerald-600" />
        <KpiCard label="Completed Reintegration" value={data?.completedReintegrationCount ?? "—"} sub="Successfully exited program" icon={CheckCircle2} iconBg="bg-primary-light" iconColor="text-primary" />
        <KpiCard label="Ready for Reintegration" value={sortedReadiness.find((t: any) => t.tier === "Ready")?.count ?? "0"} sub="Active + Low risk level" icon={ArrowUpCircle} iconBg="bg-teal-100" iconColor="text-teal-600" />
        <KpiCard label="Avg Days in Program" value={data ? `${data.avgDaysInProgram}d` : "—"} sub={data ? `~${Math.round(data.avgDaysInProgram / 30)} months` : ""} icon={TrendingUp} iconBg="bg-indigo-100" iconColor="text-indigo-600" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="rounded-xl shadow-sm">
          <CardHeader><CardTitle className="text-base">Reintegration Readiness Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={sortedReadiness} dataKey="count" nameKey="tier" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3}>
                  {sortedReadiness.map((t: any, i: number) => (
                    <Cell key={i} fill={readinessColors[t.tier] ?? PIE_COLORS[i]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip formatter={(v: number, name: string) => [`${v} residents`, name]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Current Risk Level Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mt-2">
              {riskBreakdown.map((r: any) => {
                const total = riskBreakdown.reduce((s: number, x: any) => s + x.count, 0);
                return (
                  <div key={r.level}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <RiskBadge level={r.level} />
                      <span className="text-muted-foreground">{r.count} residents ({total > 0 ? Math.round(r.count / total * 100) : 0}%)</span>
                    </div>
                    <UtilBar pct={total > 0 ? r.count / total : 0} />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl shadow-sm">
        <CardHeader><CardTitle className="text-base">Active At-Risk Residents (Critical + High Risk)</CardTitle></CardHeader>
        <CardContent>
          {atRisk.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No critical/high-risk active residents.</p>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b text-muted-foreground"><th className="text-left py-1.5">Code</th><th className="text-left">Category</th><th className="text-left">Risk</th><th className="text-left">Reintegration</th><th className="text-right">Days In</th><th className="text-left pl-3">Social Worker</th></tr></thead>
                <tbody>
                  {atRisk.map((r: any) => (
                    <tr key={r.residentId} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-1.5 font-medium">{r.internalCode}</td>
                      <td className="text-muted-foreground">{r.caseCategory ?? "—"}</td>
                      <td><RiskBadge level={r.currentRiskLevel ?? "—"} /></td>
                      <td className="text-muted-foreground">{r.reintegrationStatus ?? "—"}</td>
                      <td className="text-right">{r.daysInProgram}d</td>
                      <td className="pl-3 text-muted-foreground">{r.assignedSocialWorker ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {(() => {
        const readyCount = sortedReadiness.find((t: any) => t.tier === "Ready")?.count ?? 0;
        const approachingCount = sortedReadiness.find((t: any) => t.tier === "Approaching")?.count ?? 0;
        const criticalCount = riskBreakdown.find((r: any) => r.level?.toLowerCase() === "critical")?.count ?? 0;
        const highCount = riskBreakdown.find((r: any) => r.level?.toLowerCase() === "high")?.count ?? 0;
        const completedCount = data?.completedReintegrationCount ?? 0;
        const avgDays = data?.avgDaysInProgram ?? 0;
        const dominantRisk = [...riskBreakdown].sort((a: any, b: any) => b.count - a.count)[0];

        const readinessStatement = readyCount > 0
          ? `${readyCount} active resident${readyCount === 1 ? " has" : "s have"} Low current risk and ${readyCount === 1 ? "is" : "are"} reintegration-ready — formal assessments should begin within 30 days.`
          : approachingCount > 0
          ? `No residents are fully ready yet, but ${approachingCount} are approaching readiness (Medium risk). Focus intervention resources here to accelerate progress.`
          : "No residents are currently in the Ready or Approaching tiers. Review whether intervention intensity needs to increase.";

        const riskStatement = criticalCount > 0
          ? `${criticalCount} resident${criticalCount === 1 ? " is" : "s are"} at Critical risk — immediate case review and intervention plan revision is required this week.`
          : highCount > 0
          ? `${highCount} active resident${highCount === 1 ? " has" : "s have"} High risk status. Review whether current counseling frequency and plan completion is adequate.`
          : dominantRisk
          ? `The majority of your active residents (${dominantRisk.count}) are at ${dominantRisk.level} risk — ${dominantRisk.level?.toLowerCase() === "low" ? "a positive sign for program outcomes" : "continued intervention focus is needed"}.`
          : "";

        const programNote = completedCount > 0
          ? `${completedCount} resident${completedCount === 1 ? " has" : "s have"} successfully completed reintegration — a strong indicator of program effectiveness. Average program duration is ${Math.round(avgDays / 30)} months.`
          : avgDays > 0
          ? `Active residents have been in the program for an average of ${Math.round(avgDays / 30)} months. ${avgDays > 365 ? "Long program durations may indicate barriers to reintegration that need review." : "Program duration is within normal range."}`
          : "";

        const actions: string[] = [
          readyCount > 0
            ? `Initiate formal reintegration assessments for ${readyCount === 1 ? "the 1 Ready resident" : `all ${readyCount} Ready residents`} this month — they are program-ready now.`
            : "Work with social workers to identify the top 3 barriers preventing residents from reaching the Ready tier.",
          criticalCount > 0
            ? `URGENT: ${criticalCount} Critical-risk resident${criticalCount === 1 ? "" : "s"} need immediate case conference — increase counseling to 3×/week and revise intervention plans.`
            : highCount > 0
            ? `${highCount} High-risk resident${highCount === 1 ? " needs" : "s need"} case review this week — verify intervention plan completion rates and counseling frequency.`
            : "Maintain current intervention cadence — risk levels are manageable. Continue monthly progress reviews.",
          approachingCount > 0
            ? `${approachingCount} Approaching-readiness resident${approachingCount === 1 ? " is" : "s are"} close to the Ready threshold — intensify education and family engagement support to push them over.`
            : "Track monthly risk level changes for all residents — a two-month upward trend is an early warning requiring escalation.",
          completedCount > 0
            ? `Document reintegration success factors from your ${completedCount} completed case${completedCount === 1 ? "" : "s"} — use these patterns to strengthen active intervention plans.`
            : "Run Pipeline 04 notebook monthly with refreshed counseling, health, and education data for updated readiness scores.",
        ];

        return (
          <div className="grid lg:grid-cols-2 gap-6">
            <InterpretationCard>
              <p>{readinessStatement}</p>
              {riskStatement && <p>{riskStatement}</p>}
              {programNote && <p>{programNote}</p>}
            </InterpretationCard>
            <ActionsCard actions={actions} />
          </div>
        );
      })()}
    </div>
  );
}

function GeographicView() {
  const { data, isLoading } = useQuery({
    queryKey: ["ml-geographic"],
    queryFn: () => apiFetch<any>("/api/mlinsights/geographic"),
  });
  if (isLoading) return <LoadingSkeleton />;

  const regional = data?.regionalBreakdown ?? [];
  const houses = data?.safehouseDetails ?? [];

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Capacity" value={data?.totalCapacity?.toString() ?? "—"} sub="Across all active safehouses" icon={Building2} iconBg="bg-indigo-100" iconColor="text-indigo-600" />
        <KpiCard label="Active Residents" value={data?.totalActive?.toString() ?? "—"} sub="Currently in residence" icon={Users} iconBg="bg-emerald-100" iconColor="text-emerald-600" />
        <KpiCard label="Overall Utilization" value={data ? fmtPct(data.overallUtilization) : "—"} sub="Target: 75–90%" icon={TrendingUp} iconBg="bg-primary-light" iconColor="text-primary" />
        <KpiCard label="Near Capacity" value={data?.nearCapacityCount?.toString() ?? "—"} sub="≥ 90% occupied — monitor closely" icon={AlertTriangle} iconBg="bg-red-100" iconColor="text-red-600" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="rounded-xl shadow-sm">
          <CardHeader><CardTitle className="text-base">Regional Utilization</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={regional} margin={{ left: -10 }}>
                <XAxis dataKey="region" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `${Math.round(v * 100)}%`} domain={[0, 1]} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => [`${Math.round(v * 100)}%`, "Utilization"]} />
                <Bar dataKey="utilization" radius={[4, 4, 0, 0]}>
                  {regional.map((r: any, i: number) => (
                    <Cell key={i} fill={r.utilization >= 0.9 ? COLORS.red : r.utilization < 0.5 ? COLORS.amber : COLORS.green} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 justify-center text-xs text-muted-foreground mt-2">
              <span><span className="inline-block w-3 h-3 rounded-sm bg-emerald-500 mr-1" />Healthy (50–89%)</span>
              <span><span className="inline-block w-3 h-3 rounded-sm bg-amber-400 mr-1" />Under-utilized</span>
              <span><span className="inline-block w-3 h-3 rounded-sm bg-red-500 mr-1" />Near Capacity</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader><CardTitle className="text-base">Regional Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {regional.map((r: any) => (
                <div key={r.region}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold">{r.region}</span>
                    <span className="text-muted-foreground">{r.activeResidents}/{r.capacity} · {r.safehouses} houses</span>
                  </div>
                  <UtilBar pct={r.utilization} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl shadow-sm">
        <CardHeader><CardTitle className="text-base">Safehouse Efficiency Ranking</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b text-muted-foreground"><th className="text-left py-1.5">Safehouse</th><th className="text-left">Region</th><th className="text-left">City</th><th className="text-right">Residents</th><th className="text-right">Capacity</th><th className="text-right pr-3">Utilization</th><th className="text-left">Status</th></tr></thead>
              <tbody>
                {houses.map((h: any) => (
                  <tr key={h.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-1.5 font-medium">{h.name}</td>
                    <td className="text-muted-foreground">{h.region}</td>
                    <td className="text-muted-foreground">{h.city}</td>
                    <td className="text-right">{h.activeResidents}</td>
                    <td className="text-right">{h.capacity}</td>
                    <td className="text-right pr-3">
                      <UtilBar pct={h.utilization} />
                    </td>
                    <td>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        h.status === "Near Capacity" ? "bg-red-100 text-red-700" :
                        h.status === "Under-utilized" ? "bg-amber-100 text-amber-700" :
                        "bg-emerald-100 text-emerald-700"
                      }`}>{h.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {(() => {
        const overallUtil = data?.overallUtilization ?? 0;
        const nearCapCount = data?.nearCapacityCount ?? 0;
        const underUtil = data?.underUtilizedCount ?? 0;
        const totalHouses = houses.length;
        const sortedRegions = [...regional].sort((a: any, b: any) => b.utilization - a.utilization);
        const highestRegion = sortedRegions[0];
        const lowestRegion = sortedRegions[sortedRegions.length - 1];

        const overallStatement = overallUtil >= 0.95
          ? `Overall utilization is critically high at ${fmtPct(overallUtil)} — above 95% correlates with incident spikes and staff burnout. Immediate capacity relief is needed.`
          : overallUtil >= 0.75
          ? `Overall utilization is ${fmtPct(overallUtil)}, within the healthy 75–90% target range. Network capacity is being used efficiently.`
          : overallUtil >= 0.5
          ? `Overall utilization is ${fmtPct(overallUtil)}, below the optimal 75% floor. Some safehouses have significant unused capacity — investigate referral pipeline barriers.`
          : `Overall utilization is only ${fmtPct(overallUtil)}. More than half your capacity is unused — this may indicate funding constraints, placement bottlenecks, or intake barriers.`;

        const hotspotStatement = nearCapCount > 0
          ? `${nearCapCount} safehouse${nearCapCount === 1 ? " is" : "s are"} at or above 90% occupancy — these locations require immediate staffing and intake review to prevent quality degradation.`
          : underUtil > 0
          ? `${underUtil} safehouse${underUtil === 1 ? " is" : "s are"} under-utilized (below 50%). Consider transferring residents from high-pressure locations to balance the network.`
          : totalHouses > 0
          ? "All safehouses are in the healthy 50–89% utilization band — good network balance."
          : "";

        const regionalNote = highestRegion && lowestRegion && highestRegion.region !== lowestRegion.region
          ? `${highestRegion.region} is the most-pressured region (${fmtPct(highestRegion.utilization)}); ${lowestRegion.region} has the most available capacity (${fmtPct(lowestRegion.utilization)}). Explore cross-region transfer protocols.`
          : "";

        const actions: string[] = [
          nearCapCount > 0
            ? `URGENT: Review staffing and incident protocols for the ${nearCapCount} safehouse${nearCapCount === 1 ? "" : "s"} above 90% occupancy — this is your highest operational risk.`
            : "Maintain current capacity allocation — no safehouses are in the danger zone. Schedule a quarterly review.",
          underUtil > 0
            ? `${underUtil} under-utilized safehouse${underUtil === 1 ? " has" : "s have"} open beds — investigate whether intake referral pipelines are too restrictive or outreach is insufficient in those areas.`
            : "Occupancy is balanced across the network. Document what's working as a model for future safehouses.",
          highestRegion && lowestRegion && highestRegion.region !== lowestRegion.region
            ? `Plan capacity expansion in ${highestRegion.region} (${fmtPct(highestRegion.utilization)} utilization) for the next fiscal year — this region is approaching its ceiling.`
            : "Monitor regional utilization monthly — act when any region exceeds 85% for two consecutive months.",
          "Share this efficiency ranking with regional coordinators and use it in monthly ops review meetings.",
          // "Run Pipeline 07 (Partner Effectiveness) to identify which safehouses have critical partnership gaps affecting outcomes.",
        ];

        return (
          <div className="grid lg:grid-cols-2 gap-6">
            <InterpretationCard>
              <p>{overallStatement}</p>
              {hotspotStatement && <p>{hotspotStatement}</p>}
              {regionalNote && <p>{regionalNote}</p>}
            </InterpretationCard>
            <ActionsCard actions={actions} />
          </div>
        );
      })()}
    </div>
  );
}

function AcquisitionRoiView() {
  const { data, isLoading } = useQuery({
    queryKey: ["ml-roi"],
    queryFn: () => apiFetch<any>("/api/mlinsights/acquisition-roi"),
  });
  if (isLoading) return <LoadingSkeleton />;

  const channels = data?.channels ?? [];

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Top Channel (LTV)" value={data?.topChannelByLtv ?? "—"} sub="Highest avg donation amount" icon={TrendingUp} iconBg="bg-violet-100" iconColor="text-violet-600" />
        <KpiCard label="Top Channel (Retention)" value={data?.topChannelByRetention ?? "—"} sub="Best 12-month retention" icon={Users} iconBg="bg-emerald-100" iconColor="text-emerald-600" />
        <KpiCard label="Total Channels" value={channels.length.toString()} sub="Active acquisition sources" icon={Globe} iconBg="bg-primary-light" iconColor="text-primary" />
        <KpiCard label="Channels Tracked" value={channels.length.toString()} sub="With donation history" icon={Info} iconBg="bg-gray-100" iconColor="text-gray-500" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="rounded-xl shadow-sm">
          <CardHeader><CardTitle className="text-base">Avg Donation by Channel (Lifetime Value Proxy)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={channels} layout="vertical" margin={{ left: 100, right: 30 }}>
                <XAxis type="number" tickFormatter={(v) => fmtCurrency(v)} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="channel" tick={{ fontSize: 11 }} width={100} />
                <Tooltip formatter={(v: number) => [fmtCurrency(v), "Avg Gift"]} />
                <Bar dataKey="avgDonation" radius={[0, 4, 4, 0]}>
                  {channels.map((_: any, i: number) => (
                    <Cell key={i} fill={i === 0 ? COLORS.primary : i === 1 ? COLORS.secondary : i === 2 ? COLORS.gold : COLORS.muted} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader><CardTitle className="text-base">Retention & Recurring Rate by Channel</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4 mt-2">
              {channels.map((c: any) => (
                <div key={c.channel}>
                  <div className="flex justify-between text-sm mb-0.5">
                    <span className="font-medium">{c.channel}</span>
                    <span className="text-muted-foreground text-xs">{c.donorCount} donors</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Retention</p>
                      <UtilBar pct={c.retentionRate} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Recurring</p>
                      <UtilBar pct={c.recurringRate} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {(() => {
        const topLtv = data?.topChannelByLtv ?? null;
        const topRetention = data?.topChannelByRetention ?? null;
        const sortedByAvg = [...channels].sort((a: any, b: any) => b.avgDonation - a.avgDonation);
        const sortedByRetention = [...channels].sort((a: any, b: any) => b.retentionRate - a.retentionRate);
        const sortedByRecurring = [...channels].sort((a: any, b: any) => b.recurringRate - a.recurringRate);
        const topAvgChannel = sortedByAvg[0];
        const bottomAvgChannel = sortedByAvg[sortedByAvg.length - 1];
        const topRecurringChannel = sortedByRecurring[0];
        const topRetentionChannel = sortedByRetention[0];
        const totalDonors = channels.reduce((sum: number, c: any) => sum + c.donorCount, 0);

        const ltvStatement = topAvgChannel
          ? `${topAvgChannel.channel} leads with an average gift of ${fmtCurrency(topAvgChannel.avgDonation)} — these donors are pre-qualified and mission-aligned. This is your highest-ROI acquisition channel.`
          : "No channel donation data available yet. Ensure acquisition source is captured at registration.";

        const retentionStatement = topRetentionChannel && topRetentionChannel.retentionRate > 0
          ? topRetention === topLtv
            ? `${topRetentionChannel.channel} leads on both lifetime value and retention (${fmtPct(topRetentionChannel.retentionRate)}) — double down on this channel for maximum impact.`
            : `${topRetentionChannel.channel} has the best 12-month retention rate (${fmtPct(topRetentionChannel.retentionRate)}), though ${topLtv ?? "another channel"} leads on average gift size. Both metrics matter for long-term revenue.`
          : "";

        const lowStatement = bottomAvgChannel && sortedByAvg.length > 1
          ? `${bottomAvgChannel.channel} has the lowest average gift (${fmtCurrency(bottomAvgChannel.avgDonation)}) — this channel may be better used for donor pipeline-building than direct revenue. Use it to warm prospects, then convert via personal ask.`
          : "";

        const recurringNote = topRecurringChannel && topRecurringChannel.recurringRate > 0
          ? `${topRecurringChannel.channel} has the highest recurring donor rate (${fmtPct(topRecurringChannel.recurringRate)}) — prioritize recurring setup conversations with new donors from this source.`
          : "";

        const actions: string[] = [
          topLtv
            ? `Increase investment in '${topLtv}' — with the highest average gift, every new donor from this channel is worth 2–3× the typical acquisition cost.`
            : "Start tracking acquisition channel for every new donor — this data is essential for future ROI analysis.",
          topRetention && topRetention !== topLtv
            ? `'${topRetention}' has the best retention — create a tailored stewardship journey for these donors to maintain their 12-month loyalty.`
            : "Create a 90-day onboarding sequence for all new donors: impact report at day 7, personal thank-you at day 30, giving opportunity at day 60.",
          topRecurringChannel && topRecurringChannel.recurringRate > 0
            ? `'${topRecurringChannel.channel}' donors convert to recurring at ${fmtPct(topRecurringChannel.recurringRate)} — train staff to offer recurring setup immediately at the point of first gift for this channel.`
            : "For all first-gift donors: immediately offer recurring setup — recurring donors have 3–5× the lifetime value of one-time givers.",
          bottomAvgChannel && sortedByAvg.length > 1
            ? `For '${bottomAvgChannel.channel}' (avg gift ${fmtCurrency(bottomAvgChannel.avgDonation)}): shift strategy from direct revenue to prospect warming — use social channels to build email lists, then convert via event or personal ask.`
            : "Diversify acquisition channels to reduce single-source dependency.",
          totalDonors > 0
            ? `Across ${totalDonors.toLocaleString()} tracked donors, continue monthly pipeline analysis — first-gift amount is the strongest early predictor of lifetime value.`
            : "Run Pipeline 06 notebook monthly with updated donor registration data for refreshed LTV and retention scores.",
        ];

        return (
          <div className="grid lg:grid-cols-2 gap-6">
            <InterpretationCard>
              <p>{ltvStatement}</p>
              {retentionStatement && <p>{retentionStatement}</p>}
              {lowStatement && <p>{lowStatement}</p>}
              {recurringNote && <p>{recurringNote}</p>}
            </InterpretationCard>
            <ActionsCard actions={actions} />
          </div>
        );
      })()}
    </div>
  );
}

function StaticInsightView({
  title,
  findings,
  actions,
  dataNote,
}: {
  title: string;
  findings: { heading: string; body: string }[];
  actions: string[];
  dataNote: string;
}) {
  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {findings.map((f) => (
          <Card key={f.heading} className="rounded-xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-secondary flex items-center gap-2">
                <Brain className="w-4 h-4" /> {f.heading}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-foreground/70">{f.body}</CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <InterpretationCard>
          <p>Analysis from the <strong>{title}</strong> model run against the full dataset. Source: <code className="text-xs bg-muted px-1 rounded">{dataNote}</code>.</p>
        </InterpretationCard>
        <ActionsCard actions={actions} />
      </div>
    </div>
  );
}

// ─── Pipeline 07: Partner Effectiveness ──────────────────────────────────────

function PartnerEffectivenessView() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["ml-partner-effectiveness"],
    queryFn: () => apiFetch<any>("/api/mlinsights/partner-effectiveness"),
  });
  if (isLoading) return <LoadingSkeleton />;
  if (isError) return <div className="p-6 text-destructive">Failed to load partner data. Check backend logs.</div>;

  const byProgramArea: { area: string; count: number }[] = data?.byProgramArea ?? [];
  const byRoleType: { role: string; count: number }[] = data?.byRoleType ?? [];
  const byRegion: { region: string; count: number }[] = data?.byRegion ?? [];
  const byType: { type: string; count: number }[] = data?.byType ?? [];
  const coverage: any[] = data?.coveragePerSafehouse ?? [];

  const coverageAreaColors: Record<string, string> = {
    Education: COLORS.secondary,
    Wellbeing: COLORS.green,
    Operations: COLORS.primary,
    Logistics: COLORS.gold,
  };

  const totalSafehouses = coverage.length;
  const gapSafehouses = coverage.filter((s) => s.areasCovered < 3).length;

  const interpretation = data
    ? [
        `${data.totalActivePartners} active partners are deployed across ${totalSafehouses} safehouses, averaging ${data.avgPartnersPerSafehouse} partners and ${data.avgAreasPerSafehouse} program areas per location.`,
        data.safehousesWithFullCoverage === totalSafehouses
          ? "Every safehouse has broad coverage across at least 3 program areas — strong partner health."
          : `${gapSafehouses} safehouse${gapSafehouses !== 1 ? "s" : ""} have coverage in fewer than 3 program areas — these are priority gaps for new partner recruitment.`,
        data.topRoleType
          ? `${data.topRoleType} is the most common partner role. Ensure this isn't crowding out under-represented areas like Wellbeing and Education.`
          : "",
      ].filter(Boolean)
    : [];

  const actions: string[] = data
    ? [
        gapSafehouses > 0
          ? `Prioritize recruiting partners for the ${gapSafehouses} safehouse${gapSafehouses !== 1 ? "s" : ""} with fewer than 3 program areas covered.`
          : "Maintain current partner coverage — schedule quarterly reviews to catch any lapses.",
        byType.find((t) => t.type === "Individual")?.count ?? 0 >
        (byType.find((t) => t.type === "Organization")?.count ?? 0)
          ? "Convert individual partner relationships into formal organizational agreements for more reliable, scalable support."
          : "Strong organizational partner base — continue formalizing new relationships at the organizational level.",
        `${byRegion[byRegion.length - 1]?.region ?? "Underserved regions"} have the fewest active partners — make this a priority region for new outreach.`,
        "Set a minimum standard: every active safehouse must have at least 3 active partners across Education, Wellbeing, and Operations.",
        "Run the Partner Effectiveness notebook monthly and add partnership scores to the safehouse management page.",
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Active Partners" value={data?.totalActivePartners ?? "—"} sub="Across all safehouses" icon={Handshake} iconBg="bg-teal-100 dark:bg-teal-950/50" iconColor="text-teal-600 dark:text-teal-400" />
        <KpiCard label="Avg Partners / Safehouse" value={data?.avgPartnersPerSafehouse ?? "—"} sub="Active assignments" icon={Building2} iconBg="bg-indigo-100 dark:bg-indigo-950/50" iconColor="text-indigo-600 dark:text-indigo-400" />
        <KpiCard label="Avg Areas Covered" value={data?.avgAreasPerSafehouse ?? "—"} sub="Out of 4 program areas" icon={CheckCircle2} iconBg="bg-emerald-100 dark:bg-emerald-950/50" iconColor="text-emerald-600 dark:text-emerald-400" />
        <KpiCard label="Full Coverage" value={data ? `${data.safehousesWithFullCoverage}/${totalSafehouses}` : "—"} sub="Safehouses with 3+ areas" icon={Users} iconBg="bg-amber-100 dark:bg-amber-950/50" iconColor="text-amber-600 dark:text-amber-400" />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="rounded-xl shadow-sm">
          <CardHeader><CardTitle className="text-base">Assignments by Program Area</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byProgramArea} margin={{ left: -10 }}>
                <XAxis dataKey="area" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`${v} assignments`, "Count"]} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {byProgramArea.map((d) => (
                    <Cell key={d.area} fill={coverageAreaColors[d.area] ?? COLORS.muted} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader><CardTitle className="text-base">Partners by Role Type</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byRoleType} layout="vertical" margin={{ left: 10 }}>
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="role" tick={{ fontSize: 11 }} width={100} />
                <Tooltip formatter={(v: number) => [`${v} partners`, "Count"]} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} fill={COLORS.secondary} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Safehouse coverage table */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader><CardTitle className="text-base">Coverage by Safehouse</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-1.5 font-medium">Safehouse</th>
                  <th className="text-center">Education</th>
                  <th className="text-center">Wellbeing</th>
                  <th className="text-center">Operations</th>
                  <th className="text-center">Logistics</th>
                  <th className="text-right">Partners</th>
                </tr>
              </thead>
              <tbody>
                {coverage.map((s: any) => (
                  <tr key={s.safehouseName} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-1.5 font-medium">{s.safehouseName}</td>
                    {(["hasEducation", "hasWellbeing", "hasOperations", "hasLogistics"] as const).map((key) => (
                      <td key={key} className="text-center">
                        {s[key]
                          ? <span className="text-emerald-500">✓</span>
                          : <span className="text-red-400">✗</span>}
                      </td>
                    ))}
                    <td className="text-right text-muted-foreground">{s.partnerCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Region breakdown + interpretation */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="rounded-xl shadow-sm">
          <CardHeader><CardTitle className="text-base">Active Partners by Region</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byRegion} layout="vertical" margin={{ left: 10 }}>
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="region" tick={{ fontSize: 11 }} width={120} />
                <Tooltip formatter={(v: number) => [`${v} partners`, "Count"]} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} fill={COLORS.primary} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader><CardTitle className="text-base">Partner Type Split</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={byType} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={75} label={({ type, percent }: any) => `${type} ${Math.round(percent * 100)}%`} labelLine={false}>
                  {byType.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => [`${v} partners`, ""]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <InterpretationCard>
          {interpretation.map((p, i) => <p key={i}>{p}</p>)}
        </InterpretationCard>
        <ActionsCard actions={actions} />
      </div>
    </div>
  );
}

// ─── Pipeline 08: In-Kind Needs Forecast ─────────────────────────────────────

function InKindNeedsView() {
  const { data, isLoading } = useQuery({
    queryKey: ["ml-inkind-needs"],
    queryFn: () => apiFetch<any>("/api/mlinsights/inkind-needs"),
  });
  if (isLoading) return <LoadingSkeleton />;

  const byCategory: { category: string; quantity: number; estimatedValue: number }[] = data?.byCategory ?? [];
  const byCondition: { condition: string; count: number }[] = data?.byCondition ?? [];
  const byMonth: { month: string; quantity: number }[] = data?.byMonth ?? [];
  const byIntendedUse: { use: string; quantity: number }[] = data?.byIntendedUse ?? [];

  const conditionColors: Record<string, string> = {
    New: COLORS.green,
    Good: COLORS.secondary,
    Fair: COLORS.amber,
  };

  const categoryColors = [COLORS.primary, COLORS.secondary, COLORS.gold, COLORS.green, COLORS.red, COLORS.amber];

  const topCategory = data?.topCategory ?? "—";
  const conditionRate = data?.conditionRate ?? 0;
  const fairCount = byCondition.find((c) => c.condition === "Fair")?.count ?? 0;
  const totalItems = byCondition.reduce((s, c) => s + c.count, 0);

  const interpretation = data
    ? [
        `${data.totalQuantity.toLocaleString()} items received across ${byCategory.length} categories, with an estimated total value of ${fmtCurrency(Number(data.totalEstimatedValue))}.`,
        `${topCategory} is the highest-volume donation category — verify this matches actual program needs or adjust donation campaigns accordingly.`,
        conditionRate >= 0.85
          ? `${fmtPct(conditionRate)} of items arrived in Good or New condition — strong donor quality standards.`
          : `Only ${fmtPct(conditionRate)} of items arrived in Good or New condition. ${fairCount} item${fairCount !== 1 ? "s" : ""} were rated Fair — consider adding clearer quality guidance to donation requests.`,
      ]
    : [];

  const actions: string[] = data
    ? [
        `Promote ${byCategory[byCategory.length - 1]?.category ?? "under-donated categories"} donations — they are the lowest-volume category but likely needed.`,
        "Add Medical Supplies and Hygiene Kits to your public wish list — make these the top priority in all in-kind donor communications.",
        conditionRate < 0.85
          ? "Add a clear quality standard to in-kind intake: 'New or Like-New condition only for Medical and Hygiene items'."
          : "Continue communicating condition expectations to donors — your current quality rate is strong.",
        byMonth.length >= 2 && byMonth[byMonth.length - 1].quantity < byMonth[0].quantity
          ? "Donations appear to be declining recently — launch a targeted in-kind drive to replenish stock."
          : "Launch a 'March Medical Drive' to fill the typical Q1 supply gap with corporate partnerships.",
        "Run the In-Kind Needs Forecast notebook quarterly and update the safehouse wish list based on current gap analysis.",
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Items Received" value={data?.totalQuantity?.toLocaleString() ?? "—"} sub="All time" icon={Package} iconBg="bg-orange-100 dark:bg-orange-950/50" iconColor="text-orange-600 dark:text-orange-400" />
        <KpiCard label="Est. Total Value" value={data ? fmtCurrency(Number(data.totalEstimatedValue)) : "—"} sub="Donor estimated value" icon={TrendingUp} iconBg="bg-violet-100 dark:bg-violet-950/50" iconColor="text-violet-600 dark:text-violet-400" />
        <KpiCard label="Top Category" value={topCategory} sub="Highest donation volume" icon={Heart} iconBg="bg-red-100 dark:bg-red-950/50" iconColor="text-red-500 dark:text-red-400" />
        <KpiCard label="Good / New Condition" value={fmtPct(conditionRate)} sub="Items meeting quality bar" icon={CheckCircle2} iconBg="bg-emerald-100 dark:bg-emerald-950/50" iconColor="text-emerald-600 dark:text-emerald-400" />
      </div>

      {/* Charts row 1 */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="rounded-xl shadow-sm">
          <CardHeader><CardTitle className="text-base">Donations by Category (Quantity)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byCategory} margin={{ left: -10 }}>
                <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number, name: string) => [name === "quantity" ? `${v} items` : fmtCurrency(v), name === "quantity" ? "Quantity" : "Est. Value"]} />
                <Bar dataKey="quantity" radius={[4, 4, 0, 0]}>
                  {byCategory.map((_: any, i: number) => <Cell key={i} fill={categoryColors[i % categoryColors.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader><CardTitle className="text-base">Item Condition on Arrival</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={byCondition} dataKey="count" nameKey="condition" cx="50%" cy="50%" outerRadius={80}
                  label={({ condition, percent }: any) => `${condition} ${Math.round(percent * 100)}%`} labelLine={false}>
                  {byCondition.map((d: any) => <Cell key={d.condition} fill={conditionColors[d.condition] ?? COLORS.muted} />)}
                </Pie>
                <Tooltip formatter={(v: number) => [`${v} items`, ""]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="rounded-xl shadow-sm">
          <CardHeader><CardTitle className="text-base">Monthly Donation Volume (Last 12 Months)</CardTitle></CardHeader>
          <CardContent>
            {byMonth.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No monthly data available.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byMonth} margin={{ left: -10 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [`${v} items`, "Quantity"]} />
                  <Bar dataKey="quantity" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader><CardTitle className="text-base">Donations by Intended Use</CardTitle></CardHeader>
          <CardContent>
            {byIntendedUse.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No intended use data available.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byIntendedUse} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="use" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip formatter={(v: number) => [`${v} items`, "Quantity"]} />
                  <Bar dataKey="quantity" radius={[0, 4, 4, 0]} fill={COLORS.gold} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <InterpretationCard>
          {interpretation.map((p, i) => <p key={i}>{p}</p>)}
        </InterpretationCard>
        <ActionsCard actions={actions} />
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function MLInsights() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") as PipelineId | null;
  const activePipeline: PipelineId =
    tabParam && PIPELINES.some((p) => p.id === tabParam) ? tabParam : "churn";
  const setActivePipeline = (id: PipelineId) => setSearchParams({ tab: id });
  const active = PIPELINES.find((p) => p.id === activePipeline)!;

  return (
    <DashboardLayout title="ML Insights">
      {/* Pipeline selector */}
      <div className="mb-6 overflow-x-auto pb-1">
        <div className="flex gap-2 min-w-max">
          {PIPELINES.map((p) => {
            const isActive = p.id === activePipeline;
            return (
              <button
                key={p.id}
                onClick={() => setActivePipeline(p.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all whitespace-nowrap ${
                  isActive
                    ? `${p.bg} ${p.color} ${p.border} shadow-sm`
                    : "bg-card border-border text-muted-foreground hover:bg-muted/40"
                }`}
              >
                <p.icon className="w-4 h-4" />
                {p.shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active pipeline header */}
      <div className={`rounded-xl p-4 mb-6 border ${active.bg} ${active.border}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className={`text-lg font-bold ${active.color} flex items-center gap-2`}>
              <active.icon className="w-5 h-5" />
              {active.label}
            </h2>
            <p className="text-sm text-foreground/70 dark:text-foreground/60 mt-1 max-w-xl">{active.description}</p>
          </div>
          <div className="text-right text-xs text-muted-foreground space-y-0.5">
            <p><span className="font-medium">Model:</span> {active.modelType}</p>
            <p><span className="font-medium">Source:</span> {active.dataSource}</p>
          </div>
        </div>
      </div>

      <Separator className="mb-6" />

      {/* Pipeline content */}
      {activePipeline === "churn" && <DonorChurnView />}
      {activePipeline === "capacity" && <DonationCapacityView />}
      {activePipeline === "social" && <SocialMediaView />}
      {activePipeline === "outcomes" && <ResidentOutcomesView />}
      {activePipeline === "geographic" && <GeographicView />}
      {activePipeline === "roi" && <AcquisitionRoiView />}
      {/* {activePipeline === "partners" && <PartnerEffectivenessView />} */}
      {activePipeline === "inkind" && <InKindNeedsView />}
    </DashboardLayout>
  );
}
