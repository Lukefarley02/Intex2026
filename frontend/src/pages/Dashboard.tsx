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

// ---- Static / placeholder data ----
// Social Media metrics are not yet stored in the database (the
// social_media_posts table is not modeled). Shown as reference numbers
// until a SocialMediaPosts controller is added.
const socialPlatforms = [
  { name: "Facebook", followers: "3,200 followers", engagement: "5.1%" },
  { name: "Instagram", followers: "2,800 followers", engagement: "3.8%" },
  { name: "Twitter", followers: "1,100 followers", engagement: "2.9%" },
];

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

      {/* Social media + recent activity */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Social Media Overview */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2 text-secondary">
              <Globe className="w-5 h-5" /> Social Media Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 pb-6 mb-4 border-b text-center">
              <div>
                <p className="text-2xl font-bold text-secondary">12.4K</p>
                <p className="text-xs text-muted-foreground mt-1">Post Reach</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-secondary">4.2%</p>
                <p className="text-xs text-muted-foreground mt-1">Engagement</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-secondary">342</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Click-throughs
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {socialPlatforms.map((p) => (
                <div
                  key={p.name}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="font-semibold">{p.name}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">{p.followers}</span>
                    <span className="font-semibold text-secondary w-12 text-right">
                      {p.engagement}
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
              {/* Non-donation milestone row kept as a design anchor when list is short */}
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
