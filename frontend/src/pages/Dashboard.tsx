import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/api/client";
import {
  Users,
  DollarSign,
  TrendingUp,
  BarChart3,
  Globe,
  Award,
  Heart,
  FileText,
  ArrowRight,
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

const quickLinks = [
  { to: "/donors", label: "Manage Donors", icon: Users },
  { to: "/residents", label: "Case Management", icon: Heart },
  { to: "/reports", label: "View Reports", icon: FileText },
];

const Dashboard = () => {
  const { data, isLoading, isError } = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: () => apiFetch<DashboardStats>("/api/dashboard/stats"),
  });

  const { data: socialData } = useQuery<SocialStats>({
    queryKey: ["social-stats"],
    queryFn: () => apiFetch<SocialStats>("/api/social/stats"),
  });

  const { data: mlData } = useQuery<MLInsights>({
    queryKey: ["ml-insights"],
    queryFn: () => apiFetch<MLInsights>("/api/mlinsights"),
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
      pipeline: "Pipeline 01: Churn Prediction",
      action: { to: "/donors", label: "Review" },
    },
    {
      label: "Upgrade Opportunities",
      value: mlData ? mlData.upgradeOpportunityCount.toString() : "—",
      sub: "Recurring donors with headroom",
      icon: ArrowUpCircle,
      iconBg: "bg-gold/10",
      iconColor: "text-gold",
      pipeline: "Pipeline 02: Donation Capacity",
      action: { to: "/donors", label: "View list" },
    },
    {
      label: "Ready for Reintegration",
      value: mlData ? mlData.residentsReadyCount.toString() : "—",
      sub: "Active residents, low risk",
      icon: CheckCircle2,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      pipeline: "Pipeline 04: Resident Outcomes",
      action: { to: "/residents", label: "Review cases" },
    },
    {
      label: "Safehouses Near Capacity",
      value: mlData ? mlData.safehousesNearCapacity.toString() : "—",
      sub: "≥ 90% occupancy",
      icon: Building2,
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
      pipeline: "Pipeline 05: Geographic Performance",
      action: { to: "/safehouses", label: "View map" },
    },
  ];

  return (
    <DashboardLayout title="Dashboard">
      {isError && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          Could not load dashboard stats from the server. Showing placeholders.
        </div>
      )}

      {/* Metric cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {metrics.map((m) => (
          <Card key={m.label} className="rounded-xl shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <span className="text-sm text-muted-foreground">{m.label}</span>
                <div className="w-9 h-9 rounded-lg bg-primary-light flex items-center justify-center flex-shrink-0">
                  <m.icon className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div className="text-3xl font-bold text-primary">
                {isLoading ? "…" : m.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{m.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ML Insights row */}
      <div className="mb-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          ML Insights
        </h2>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {mlCards.map((card) => (
          <Card key={card.label} className="rounded-xl shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-muted-foreground">{card.label}</span>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate">
                    {card.pipeline}
                  </p>
                </div>
                <div
                  className={`w-9 h-9 rounded-lg ${card.iconBg} flex items-center justify-center flex-shrink-0 ml-2`}
                >
                  <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
              </div>
              <div className="text-3xl font-bold text-foreground">
                {card.value}
              </div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-muted-foreground">{card.sub}</p>
                <Link
                  to={card.action.to}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  {card.action.label} →
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Social media + recent activity */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Social Media Overview — live from /api/social/stats */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2 text-secondary">
              <Globe className="w-5 h-5" /> Social Media Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 pb-6 mb-4 border-b text-center">
              <div>
                <p className="text-2xl font-bold text-secondary">
                  {socialData
                    ? socialData.totalReach >= 1000
                      ? `${(socialData.totalReach / 1000).toFixed(1)}K`
                      : socialData.totalReach.toLocaleString()
                    : "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Total Reach</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-secondary">
                  {socialData
                    ? `${(socialData.avgEngagementRate * 100).toFixed(1)}%`
                    : "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Avg Engagement
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-secondary">
                  {socialData
                    ? socialData.totalClickThroughs.toLocaleString()
                    : "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Click-throughs
                </p>
              </div>
            </div>
            <div className="space-y-3">
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
        <Card className="rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
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
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-primary-light text-primary">
                      <DollarSign className="w-4 h-4" />
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
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-gold/10 text-gold">
                    <Award className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      Ember case management online
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

      {/* Quick action cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        {quickLinks.map((link) => (
          <Link key={link.to} to={link.to}>
            <Card className="rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <link.icon className="w-5 h-5 text-primary" />
                  <span className="font-semibold">{link.label}</span>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
