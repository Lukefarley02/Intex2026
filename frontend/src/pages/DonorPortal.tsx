import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Heart, DollarSign, Users, ArrowRight, FileText, HandHeart, MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
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
  // Added Apr 8 2026 — linear "months of care funded" metric. Always
  // proportional to dollars given (unlike girls_helped, which is the
  // integer count of full girl-years funded), so small/recurring donors
  // always see positive movement on their impact dashboard instead of a
  // plateau at 0 or 1.
  months_of_care: number;
  monthly_cost_per_girl: number;
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
  // Notes carries the item description for in-kind donations logged by
  // staff (e.g. "5 boxes of school supplies"). Null for most cash gifts.
  notes: string | null;
}

interface Campaign {
  name: string;
  description: string;
  raised: number;
  goal: number;
  donationCount: number;
  endDate: string | null;
}

// /api/public/safehouses response — public, no PII. Used to populate the
// "Donate to a location" picker in the donor portal.
interface PublicSafehouse {
  safehouseId: number;
  name: string;
  city: string | null;
  region: string | null;
  capacity: number;
  activeResidents: number;
}

// ---- Helpers ----

const formatCurrency = (n: number) =>
  `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

const formatDate = (iso: string | null) => (iso ? iso.slice(0, 10) : "—");

// Public donations designated to a specific safehouse are stamped into
// donations.notes by PublicController as "… · Designated for: <name>"
// (the full format is "Online donation via /donate · Designated for: X"
// — see PublicController.cs line 372-378). The marker can appear either
// at the start of the notes string or after a separator, so we scan for
// it anywhere in the value. Returns null when the note doesn't contain
// the marker (e.g. in-kind item descriptions).
const extractDesignatedSafehouse = (notes: string | null): string | null => {
  if (!notes) return null;
  const match = notes.match(/Designated for:\s*([^·|;]+?)\s*$/i);
  return match ? match[1].trim() : null;
};

const DonorPortal = () => {
  const navigate = useNavigate();
  const [pickedSafehouse, setPickedSafehouse] = useState<string>("");

  const profileQ = useQuery<DonorProfile>({
    queryKey: ["donor-profile"],
    queryFn: () => apiFetch<DonorProfile>("/api/donorportal/me"),
    retry: false,
  });

  const impactQ = useQuery<DonorImpact>({
    queryKey: ["donor-impact"],
    queryFn: () => apiFetch<DonorImpact>("/api/donorportal/me/impact"),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const donationsQ = useQuery<DonationRow[]>({
    queryKey: ["donor-donations"],
    queryFn: () => apiFetch<DonationRow[]>("/api/donorportal/me/donations"),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const campaignsQ = useQuery<Campaign[]>({
    queryKey: ["campaigns"],
    queryFn: () => apiFetch<Campaign[]>("/api/campaigns"),
  });

  // Safehouses from the public endpoint — used by the "Donate to a
  // location" picker. This endpoint is [AllowAnonymous] and returns only
  // name/city/region/capacity/active count, so it's safe to hit from a
  // Donor-role JWT even though Donors cannot see the admin Safehouses page.
  const safehousesQ = useQuery<PublicSafehouse[]>({
    queryKey: ["public-safehouses"],
    queryFn: () => apiFetch<PublicSafehouse[]>("/api/public/safehouses"),
  });

  const profile = profileQ.data;
  const impact = impactQ.data;
  const donations = donationsQ.data ?? [];
  const campaigns = campaignsQ.data ?? [];
  const safehouses = safehousesQ.data ?? [];

  const donorName =
    profile?.displayName ||
    [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") ||
    "Friend";

  const totalContributions = impact?.total_donated ?? 0;
  const donationsMade = impact?.donation_count ?? 0;

  // Whole months of care funded — $25 = 1 month of support for 1 girl.
  // Always floored so the number never overstates what was actually bought.
  const monthsOfCare = Math.floor(impact?.months_of_care ?? 0);
  // Whether the donor has funded at least 1 full month of care. Used to
  // decide whether to show the "1 girl supported" framing. Even a single
  // month of $25 support goes toward one girl's care — we always credit
  // "1 girl" rather than a derived "girl-years" count (which would show 0
  // for anyone below the $300/year threshold and misrepresent reality).
  const hasProvidedCare = monthsOfCare >= 1;
  const formatMonths = (m: number) => {
    if (m >= 24) return `${Math.floor(m / 12)} yrs`;
    return `${m} mo`;
  };

  return (
    <DashboardLayout title="My Impact" fitViewport>
      {/* Full-viewport flex column — header bar, stats row, bottom grid.
          Each child that can grow uses min-h-0 + overflow-y-auto so the
          whole page fits in 100vh without a page-level scrollbar. */}
      <div className="flex flex-col h-full gap-3">
        {/* Compact hero banner — padding shrunk, Total Contributions
            inlined, tax-receipt button collapsed into a small inline
            action next to "Make a donation" to save vertical space. */}
        <div className="gradient-ember rounded-xl px-5 py-4 text-white shadow-sm flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2 leading-tight">
                Thank you, {donorName}! <span className="text-gold">💛</span>
              </h2>
              <p className="text-white/90 text-xs sm:text-sm mt-1">
                {hasProvidedCare ? (
                  <>
                    Your giving has provided{" "}
                    <strong>{formatMonths(monthsOfCare)}</strong> of shelter,
                    meals, counseling, and schooling — supporting{" "}
                    <strong>1 girl's journey</strong> toward healing and
                    reintegration. Every month matters.
                  </>
                ) : (
                  <>
                    Your generosity is contributing toward shelter, meals,
                    counseling, and schooling for the girls in our
                    safehouses. Every gift adds up.
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center gap-4 sm:pl-5 sm:border-l sm:border-white/20 flex-shrink-0">
              <div className="text-left sm:text-right">
                <p className="text-2xl sm:text-3xl font-bold leading-none">
                  {formatCurrency(totalContributions)}
                </p>
                <p className="text-white/80 text-[11px] mt-0.5">
                  Total Contributions
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Link to="/donate">
                  <Button
                    size="sm"
                    className="bg-white text-primary hover:bg-white/90 font-semibold h-8 whitespace-nowrap"
                  >
                    <HandHeart className="w-4 h-4 mr-1.5" />
                    Donate
                  </Button>
                </Link>
                <Link to="/tax-receipt">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="bg-white/10 text-white border border-white/30 hover:bg-white/20 font-semibold h-8 whitespace-nowrap text-xs"
                  >
                    <FileText className="w-3.5 h-3.5 mr-1.5" />
                    Tax receipt
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Profile / impact load errors */}
        {(profileQ.isError || impactQ.isError) && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-sm text-destructive flex-shrink-0">
            We couldn't load your donor profile. Make sure you are signed in
            as a Donor.
          </div>
        )}

        {/* Stat cards — ultra-compact single row (3-col because Total
            Given is already in the hero, so we drop that card here). */}
        <div className="grid grid-cols-3 gap-3 flex-shrink-0">
          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-primary-light flex items-center justify-center flex-shrink-0">
                  <Heart className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold leading-none">
                    {formatMonths(monthsOfCare)}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1 truncate">
                    Care Provided
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-primary-light flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold leading-none">
                    {hasProvidedCare ? "1 girl" : "—"}
                  </p>
                  <p
                    className="text-[11px] text-muted-foreground mt-1 truncate"
                    title={
                      hasProvidedCare
                        ? `Your donations fund ${formatMonths(monthsOfCare)} of care for one girl — $25 covers one month of shelter, meals, counseling, and schooling.`
                        : "Your first gift will begin supporting a girl's journey."
                    }
                  >
                    {hasProvidedCare
                      ? `supported · ${formatMonths(monthsOfCare)} of care`
                      : "Girl Supported"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-secondary" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold leading-none">
                    {donationsMade}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1 truncate">
                    Donations Made
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Inline safehouse designation — collapsed from a full card into
            a single-row strip (icon + dropdown + button) so it takes
            ~48px of vertical space instead of ~140px. */}
        <div className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2 shadow-sm flex-shrink-0">
          <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="text-sm font-medium flex-shrink-0 hidden sm:inline">
            Donate to a safehouse:
          </span>
          <Select
            value={pickedSafehouse}
            onValueChange={setPickedSafehouse}
            disabled={safehousesQ.isLoading || safehouses.length === 0}
          >
            <SelectTrigger
              className="flex-1 h-8 text-sm"
              aria-label="Select a safehouse to donate to"
            >
              <SelectValue
                placeholder={
                  safehousesQ.isLoading
                    ? "Loading…"
                    : safehouses.length === 0
                      ? "No safehouses available"
                      : "Choose a safehouse…"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {safehouses.map((s) => {
                const location = [s.city, s.region]
                  .filter(Boolean)
                  .join(", ");
                return (
                  <SelectItem key={s.safehouseId} value={s.name}>
                    {s.name}
                    {location ? ` — ${location}` : ""}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Button
            variant="hero"
            size="sm"
            className="h-8 flex-shrink-0"
            disabled={!pickedSafehouse}
            onClick={() =>
              navigate(
                `/donate?location=${encodeURIComponent(pickedSafehouse)}`,
              )
            }
          >
            <HandHeart className="w-4 h-4 mr-1" />
            Go
          </Button>
        </div>

        {/* Two-column: Donation History + Active Campaigns. This row
            takes whatever vertical space is left in the viewport, and
            each card has its own internal scroll so neither overflows
            the page. min-h-0 is mandatory on flex children that contain
            an overflow-y-auto child — without it the child's intrinsic
            content height wins and you get page-level scroll instead. */}
        <div className="grid lg:grid-cols-2 gap-4 flex-1 min-h-0">
          {/* Donation history — flex column with internal overflow-y-auto
              so long histories scroll inside the card instead of
              stretching the page. */}
          <Card className="rounded-xl shadow-sm flex flex-col min-h-0">
            <CardHeader className="pb-2 flex-shrink-0">
              <CardTitle className="text-lg">Donation History</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 overflow-y-auto">
              <div className="grid grid-cols-[1fr_1.4fr_auto] gap-4 pb-2 mb-1 border-b text-[11px] font-semibold text-muted-foreground uppercase tracking-wide sticky top-0 bg-card">
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
                {donations.map((d) => {
                // In-kind donations come in with donationType containing
                // "InKind" / "In-Kind", a null `amount`, an `estimatedValue`
                // set by staff, and an item description in `notes`. Show a
                // gold badge + the item description so donors can tell
                // cash and non-cash gifts apart on the history table.
                const isInKind =
                  !!d.donationType && /in[\s-]?kind/i.test(d.donationType);
                // For cash gifts, check whether the donor earmarked this
                // donation to a specific safehouse. If so, relabel
                // "General Fund" → "<Safehouse> General Fund" and, when
                // there IS a campaign, prefix the campaign with the
                // safehouse name so donors can see both attributions.
                const designatedSafehouse = !isInKind
                  ? extractDesignatedSafehouse(d.notes)
                  : null;
                // PublicController always writes a campaign_name (defaults
                // to the literal string "General Fund" when the donor
                // didn't pick one), so we treat "General Fund" as the
                // "no specific campaign" sentinel rather than null.
                const hasRealCampaign =
                  !!d.campaignName &&
                  d.campaignName.trim().toLowerCase() !== "general fund";
                const campaignLabel = designatedSafehouse
                  ? hasRealCampaign
                    ? `${designatedSafehouse} — ${d.campaignName}`
                    : `${designatedSafehouse} General Fund`
                  : hasRealCampaign
                    ? d.campaignName!
                    : "General Fund";
                return (
                  <div
                    key={d.donationId}
                    className="grid grid-cols-[1fr_1.4fr_auto] gap-4 py-2.5 items-start text-sm"
                  >
                    <span className="text-muted-foreground">
                      {formatDate(d.donationDate)}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">
                          {campaignLabel}
                        </span>
                        {isInKind && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gold/10 text-gold border border-gold/20">
                            In-Kind
                          </span>
                        )}
                      </div>
                      {isInKind && d.notes && (
                        <p className="text-xs text-muted-foreground truncate">
                          {d.notes}
                        </p>
                      )}
                    </div>
                    <span className="text-right font-semibold whitespace-nowrap">
                      {formatCurrency(d.amount ?? d.estimatedValue ?? 0)}
                      {isInKind && (
                        <span className="block text-[10px] font-normal text-muted-foreground">
                          est. value
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

          {/* Active campaigns — matches the donation-history card's
              flex-column layout so it can scroll internally instead of
              pushing the page. pb-2 on the header keeps the footprint
              tight so more campaign cards are visible at a glance. */}
          <Card className="rounded-xl shadow-sm flex flex-col min-h-0">
            <CardHeader className="pb-2 flex-shrink-0">
              <CardTitle className="text-lg">Active Campaigns</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Contribute to a campaign that matters to you
              </p>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 overflow-y-auto space-y-3">
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
              {campaigns.map((c) => {
                const pct =
                  c.goal > 0
                    ? Math.min(100, Math.round((c.raised / c.goal) * 100))
                    : 0;
                return (
                  <div
                    key={c.name}
                    className="p-3 rounded-lg border bg-card space-y-2"
                  >
                    <div>
                      <h3 className="font-semibold text-sm">{c.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {c.description}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium">
                          {formatCurrency(c.raised)} raised
                        </span>
                        <span className="font-semibold text-primary">
                          {pct}%
                        </span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                      <p className="text-[11px] text-muted-foreground">
                        Goal: {formatCurrency(c.goal)}
                        {c.endDate ? ` · Ends ${c.endDate}` : ""}
                      </p>
                    </div>
                    <Link
                      to={`/donate?campaign=${encodeURIComponent(c.name)}`}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-center h-8"
                      >
                        Contribute <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                      </Button>
                    </Link>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DonorPortal;
