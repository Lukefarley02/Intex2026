import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/api/client";
import { useAuth } from "@/api/AuthContext";
import {
  Users,
  DollarSign,
  TrendingUp,
  BarChart3,
  Globe,
  Award,
  AlertTriangle,
  ArrowUpCircle,
  CheckCircle2,
  Building2,
} from "lucide-react";

// ---- Types matching /api/dashboard/stats ----

interface RecentActivityItem {
  supporterName: string;
  amount: number;
  date: string | null;
  campaign: string | null;
}

interface DashboardStats {
  activeDonors: number;
  donorsThisMonth: number;
  donationsYtd: number;
  donationsYtdChangePct: number | null;
  donationsThisMonth: number;
  donationsMonthChangePct: number | null;
  donorRetention: number;
  recentActivity: RecentActivityItem[];
}

// ---- Types matching /api/social/stats ----

interface PlatformStat {
  platform: string;
  postCount: number;
  totalReach: number;
  avgEngagementRate: number;
  donationReferrals: number;
}

interface SocialStats {
  totalPosts: number;
  totalReach: number;
  avgEngagementRate: number;
  totalClickThroughs: number;
  platformBreakdown: PlatformStat[];
}

// ---- Types matching /api/mlinsights ----

interface MLInsights {
  atRiskDonorCount: number;
  upgradeOpportunityCount: number;
  residentsReadyCount: number;
  safehousesNearCapacity: number;
  topSocialPlatform: string | null;
  topSocialReferrals: number;
}

// ---- Formatters ----

const formatCompactCurrency = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
};

const formatDate = (iso: string | null) => {
  if (!iso) return "";
  return iso.slice(0, 10);
};

const formatPct = (n: number) => `${Math.round(n * 100)}%`;

const formatSignedPct = (n: number | null) => {
  if (n === null || !isFinite(n)) return "No prior data";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${Math.round(n * 100)}%`;
};

const Dashboard = () => {
  const { isFounder } = useAuth();
  const { data, isLoading, isError } = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: () => apiFetch<DashboardStats>("/api/dashboard/stats"),
  });

  const { data: socialData } = useQuery<SocialStats>({
    queryKey: ["social-stats"],
    queryFn: () => apiFetch<SocialStats>("/api/social/stats"),
    retry: false,
  });

  const { data: mlData } = useQuery<MLInsights>({
    queryKey: ["ml-insights"],
    queryFn: () => apiFetch<MLInsights>("/api/mlinsights"),
    retry: false,
  });

  const metrics = [
    {
      label: "Active Donors",
      value: data ? data.activeDonors.toLocaleString() : "—",
      change: data ? `+${data.donorsThisMonth} this month` : " ",
      icon: Users,
    },
    {
      label: "Total Donations YTD",
      value: data ? formatCompactCurrency(data.donationsYtd) : "—",
      change: data
        ? `${formatSignedPct(data.donationsYtdChangePct)} vs last year`
        : " ",
      icon: DollarSign,
    },
    {
      label: "Monthly Donations",
      value: data ? formatCompactCurrency(data.donationsThisMonth) : "—",
      change: data
        ? `${formatSignedPct(data.donationsMonthChangePct)} vs last month`
        : " ",
      icon: TrendingUp,
    },
    {
      label: "Donor Retention",
      value: data ? formatPct(data.donorRetention) : "—",
      change: "Industry avg: 45%",
      icon: BarChart3,
    },
  ];

  // ML insight cards — each maps to a pipeline output
  const mlCards = [
    {
      label: "At-Risk Donors",
      value: mlData ? mlData.atRiskDonorCount.toString() : "—",
      sub: "No gift in 90+ days",
      icon: AlertTriangle,
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
      pipeline: "Donor Turnover",
      action: { to: "/ml-insights?tab=churn", label: "Review" },
    },
    {
      label: "Upgrade Opportunities",
      value: mlData ? mlData.upgradeOpportunityCount.toString() : "—",
      sub: "Recurring donors with headroom",
      icon: ArrowUpCircle,
      iconBg: "bg-gold/10",
      iconColor: "text-gold",
      pipeline: "Donor Improvement",
      action: { to: "/ml-insights?tab=capacity", label: "View list" },
    },
    {
      label: "Ready for Reintegration",
      value: mlData ? mlData.residentsReadyCount.toString() : "—",
      sub: "Active residents, low risk",
      icon: CheckCircle2,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      pipeline: "Resident Outcomes",
      action: { to: "/ml-insights?tab=outcomes", label: "Review cases" },
    },
    {
      label: "Safehouses Near Capacity",
      value: mlData ? mlData.safehousesNearCapacity.toString() : "—",
      sub: "≥ 90% occupancy",
      icon: Building2,
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
      pipeline: "Safehouse Performance & Growth",
      action: { to: "/ml-insights?tab=geographic", label: "View map" },
    },
  ];

  return (
    <DashboardLayout title="Dashboard" fitViewport>
      <div className="flex flex-col h-full gap-3">
      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive flex-shrink-0">
          Could not load dashboard stats from the server. Showing placeholders.
        </div>
      )}

      {/* Metric cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 flex-shrink-0">
        {metrics.map((m) => (
          <Card key={m.label} className="rounded-xl shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-start justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">{m.label}</span>
                <div className="w-7 h-7 rounded-lg bg-primary-light flex items-center justify-center flex-shrink-0">
                  <m.icon className="w-4 h-4 text-primary" aria-hidden="true" />
                </div>
              </div>
              <div className="text-2xl font-bold text-primary leading-tight">
                {isLoading ? "…" : m.value}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{m.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ML Insights row — Founder-only */}
      {isFounder && (
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 flex-shrink-0">
        {mlCards.map((card) => (
          <Card key={card.label} className="rounded-xl shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-start justify-between mb-1.5">
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-muted-foreground">{card.label}</span>
                  <p className="text-[9px] text-muted-foreground/60 mt-0.5 truncate">
                    {card.pipeline}
                  </p>
                </div>
                <div
                  className={`w-7 h-7 rounded-lg ${card.iconBg} flex items-center justify-center flex-shrink-0 ml-2`}
                >
                  <card.icon className={`w-4 h-4 ${card.iconColor}`} aria-hidden="true" />
                </div>
              </div>
              <div className="text-2xl font-bold text-foreground leading-tight">
                {card.value}
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-[10px] text-muted-foreground truncate">{card.sub}</p>
                <Link
                  to={card.action.to}
                  className="text-[10px] font-medium text-primary hover:underline flex-shrink-0 ml-2"
                  aria-label={`${card.action.label} — ${card.label}`}
                >
                  {card.action.label} →
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      )}

      {/* Social media + recent activity — flex-1 so they absorb remaining space */}
      <div className="grid lg:grid-cols-2 gap-3 flex-1 min-h-0">
        {/* Social Media Overview — live from /api/social/stats */}
        <Card className="rounded-xl shadow-sm flex flex-col min-h-0">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-base flex items-center gap-2 text-secondary">
              <Globe className="w-4 h-4" aria-hidden="true" /> Social Media Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 overflow-y-auto">
            <div className="grid grid-cols-3 gap-3 pb-3 mb-3 border-b text-center">
              <div>
                <p className="text-xl font-bold text-secondary">
                  {socialData
                    ? socialData.totalReach >= 1000
                      ? `${(socialData.totalReach / 1000).toFixed(1)}K`
                      : socialData.totalReach.toLocaleString()
                    : "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Total Reach</p>
              </div>
              <div>
                <p className="text-xl font-bold text-secondary">
                  {socialData
                    ? `${(socialData.avgEngagementRate * 100).toFixed(1)}%`
                    : "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Avg Engagement
                </p>
              </div>
              <div>
                <p className="text-xl font-bold text-secondary">
                  {socialData
                    ? socialData.totalClickThroughs.toLocaleString()
                    : "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Click-throughs
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {socialData && socialData.platformBreakdown.length > 0
                ? socialData.platformBreakdown.slice(0, 5).map((p) => (
                    <div
                      key={p.platform}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="font-semibold">{p.platform}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-muted-foreground">
                          {p.totalReach >= 1000
                            ? `${(p.totalReach / 1000).toFixed(1)}K reach`
                            : `${p.totalReach} reach`}
                        </span>
                        <span className="font-semibold text-secondary w-14 text-right">
                          {(p.avgEngagementRate * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))
                : // Fallback while loading or if table is empty
                  [
                    { name: "Facebook", reach: "—", eng: "—" },
                    { name: "Instagram", reach: "—", eng: "—" },
                    { name: "TikTok", reach: "—", eng: "—" },
                  ].map((p) => (
                    <div
                      key={p.name}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="font-semibold">{p.name}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-muted-foreground">
                          {p.reach} reach
                        </span>
                        <span className="font-semibold text-secondary w-14 text-right">
                          {p.eng}
                        </span>
                      </div>
                    </div>
                  ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity — live donations from the database */}
        <Card className="rounded-xl shadow-sm flex flex-col min-h-0">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 overflow-y-auto">
            <div className="space-y-3">
              {isLoading && (
                <p className="text-sm text-muted-foreground">
                  Loading activity…
                </p>
              )}
              {!isLoading && data?.recentActivity.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No recent donations recorded.
                </p>
              )}
              {data?.recentActivity.map((a, i) => {
                const text = `${a.supporterName} donated $${Math.round(
                  a.amount,
                ).toLocaleString()}`;
                return (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-primary-light text-primary">
                      <DollarSign className="w-3.5 h-3.5" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{text}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(a.date)}
                        {a.campaign ? ` · ${a.campaign}` : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
              {data?.recentActivity && data.recentActivity.length < 3 && (
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-gold/10 text-gold">
                    <Award className="w-3.5 h-3.5" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      Ember Foundation case management online
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      System milestone
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
