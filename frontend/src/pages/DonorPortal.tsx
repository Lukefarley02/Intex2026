import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Heart, DollarSign, Users, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/api/client";

// ---- Types matching backend DonorPortalController & CampaignsController ----

interface DonorProfile {
  supporterId: number;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

interface DonorImpact {
  total_donated: number;
  total_estimated_value: number;
  donation_count: number;
  girls_helped: number;
  cost_per_girl: number;
  first_donation_date: string | null;
  most_recent_donation_date: string | null;
  campaigns_supported: string[];
}

interface DonationRow {
  donationId: number;
  donationType: string | null;
  donationDate: string | null;
  amount: number | null;
  estimatedValue: number | null;
  campaignName: string | null;
  isRecurring: boolean;
  channelSource: string | null;
}

interface Campaign {
  name: string;
  description: string;
  raised: number;
  goal: number;
  donationCount: number;
  endDate: string | null;
}

// ---- Helpers ----

const formatCurrency = (n: number) =>
  `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

const formatDate = (iso: string | null) => (iso ? iso.slice(0, 10) : "—");

const DonorPortal = () => {
  const profileQ = useQuery<DonorProfile>({
    queryKey: ["donor-profile"],
    queryFn: () => apiFetch<DonorProfile>("/api/donorportal/me"),
    retry: false,
  });

  const impactQ = useQuery<DonorImpact>({
    queryKey: ["donor-impact"],
    queryFn: () => apiFetch<DonorImpact>("/api/donorportal/me/impact"),
  });

  const donationsQ = useQuery<DonationRow[]>({
    queryKey: ["donor-donations"],
    queryFn: () => apiFetch<DonationRow[]>("/api/donorportal/me/donations"),
  });

  const campaignsQ = useQuery<Campaign[]>({
    queryKey: ["campaigns"],
    queryFn: () => apiFetch<Campaign[]>("/api/campaigns"),
  });

  const profile = profileQ.data;
  const impact = impactQ.data;
  const donations = donationsQ.data ?? [];
  const campaigns = campaignsQ.data ?? [];

  const donorName =
    profile?.displayName ||
    [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") ||
    "Friend";

  const totalContributions = impact?.total_donated ?? 0;
  const donationsMade = impact?.donation_count ?? 0;

  // girls_helped is computed server-side from the live cost-per-girl ratio
  // (total program funding ÷ total girls ever served), so it updates
  // automatically whenever a new donation or resident is recorded.
  const girlsHelped = impact?.girls_helped ?? 0;

  return (
    <DashboardLayout title="My Impact">
      {/* Hero banner */}
      <div className="gradient-ember rounded-xl p-6 sm:p-8 mb-6 text-white shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center gap-2">
              Thank you, {donorName}! <span className="text-gold">💛</span>
            </h2>
            <p className="text-white/90 text-sm sm:text-base">
              Your generous donations have helped{" "}
              <strong>{girlsHelped} girls</strong> access safety, counseling,
              and education this year.
            </p>
          </div>
          <div className="text-left sm:text-right sm:pl-6 sm:border-l sm:border-white/20">
            <p className="text-3xl sm:text-4xl font-bold leading-none">
              {formatCurrency(totalContributions)}
            </p>
            <p className="text-white/80 text-xs sm:text-sm mt-1">
              Total Contributions
            </p>
          </div>
        </div>
      </div>

      {/* Profile / impact load errors */}
      {(profileQ.isError || impactQ.isError) && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          We couldn't load your donor profile. Make sure you are signed in as a
          Donor.
        </div>
      )}

      {/* Stat cards */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary-light flex items-center justify-center flex-shrink-0">
                <Heart className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold leading-none">{girlsHelped}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Girls Helped
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold leading-none">
                  {formatCurrency(totalContributions)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Total Given
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold leading-none">
                  {donationsMade}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Donations Made
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two-column: Donation History + Active Campaigns */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Donation history — live data from /api/donorportal/me/donations */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Donation History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[1fr_1.4fr_auto] gap-4 pb-3 mb-2 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <span>Date</span>
              <span>Campaign</span>
              <span className="text-right">Amount</span>
            </div>
            {donationsQ.isLoading && (
              <p className="py-4 text-sm text-muted-foreground">
                Loading donation history…
              </p>
            )}
            {!donationsQ.isLoading && donations.length === 0 && (
              <p className="py-4 text-sm text-muted-foreground">
                No donations found yet. Thank you for considering a gift.
              </p>
            )}
            <div className="divide-y">
              {donations.slice(0, 10).map((d) => (
                <div
                  key={d.donationId}
                  className="grid grid-cols-[1fr_1.4fr_auto] gap-4 py-4 items-center text-sm"
                >
                  <span className="text-muted-foreground">
                    {formatDate(d.donationDate)}
                  </span>
                  <span className="font-medium">
                    {d.campaignName ?? "General Fund"}
                  </span>
                  <span className="text-right font-semibold">
                    {formatCurrency(d.amount ?? d.estimatedValue ?? 0)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Active campaigns — aggregated from donations table */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Active Campaigns</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Contribute to a campaign that matters to you
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {campaignsQ.isLoading && (
              <p className="text-sm text-muted-foreground">
                Loading campaigns…
              </p>
            )}
            {!campaignsQ.isLoading && campaigns.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No active campaigns at the moment.
              </p>
            )}
            {campaigns.slice(0, 3).map((c) => {
              const pct =
                c.goal > 0 ? Math.min(100, Math.round((c.raised / c.goal) * 100)) : 0;
              return (
                <div
                  key={c.name}
                  className="p-4 rounded-lg border bg-card space-y-3"
                >
                  <div>
                    <h3 className="font-semibold text-base">{c.name}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {c.description}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">
                        {formatCurrency(c.raised)} raised
                      </span>
                      <span className="font-semibold text-primary">{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      Goal: {formatCurrency(c.goal)}
                      {c.endDate ? ` · Ends ${c.endDate}` : ""}
                    </p>
                  </div>
                  <Button variant="outline" className="w-full justify-center">
                    Contribute <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default DonorPortal;
