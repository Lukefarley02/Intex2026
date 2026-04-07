import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Send, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/api/client";

// ---- Types ----
//
// Matches the projection returned by /api/supporters. All donation-derived
// fields (totalDonated, donationCount, lastGiftDate) are aggregated server
// side via a LEFT JOIN on the donations table.

interface SupporterRow {
  supporterId: number;
  supporterType: string; // MonetaryDonor | InKindDonor | Volunteer | SkillsContributor | SocialMediaAdvocate | PartnerOrganization
  displayName: string | null;
  organizationName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  region: string | null;
  country: string | null;
  relationshipType: string | null;
  status: string | null;
  acquisitionChannel: string | null;
  createdAt: string | null;
  firstDonationDate: string | null;
  totalDonated: number;
  donationCount: number;
  lastGiftDate: string | null;
}

// ---- Helpers ----

// Supporter types that qualify as "donors" per Appendix A of the case doc.
const DONOR_TYPES = ["MonetaryDonor", "InKindDonor"] as const;
type DonorTypeFilter = "all" | "MonetaryDonor" | "InKindDonor";

const TYPE_LABELS: Record<string, string> = {
  MonetaryDonor: "Monetary",
  InKindDonor: "In-Kind",
};

const formatCurrency = (n: number) =>
  `$${Math.round(n).toLocaleString("en-US")}`;

const initials = (s: SupporterRow) => {
  const base =
    s.displayName ||
    s.organizationName ||
    [s.firstName, s.lastName].filter(Boolean).join(" ") ||
    "?";
  return base
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
};

const displayName = (s: SupporterRow) =>
  s.displayName ||
  s.organizationName ||
  [s.firstName, s.lastName].filter(Boolean).join(" ") ||
  `Supporter #${s.supporterId}`;

// Derive risk label from days since last gift.
// Active  = gave within 60 days
// Watch   = 60–89 days
// At risk = 90+ days
// Dormant = never gave
const computeRisk = (s: SupporterRow): "Active" | "Watch" | "At risk" | "Dormant" => {
  if (!s.lastGiftDate) return "Dormant";
  const last = new Date(s.lastGiftDate).getTime();
  if (isNaN(last)) return "Dormant";
  const days = Math.floor((Date.now() - last) / (1000 * 60 * 60 * 24));
  if (days < 60) return "Active";
  if (days < 90) return "Watch";
  return "At risk";
};

const riskColor: Record<string, string> = {
  "At risk": "bg-primary/10 text-primary border-primary/20",
  Watch: "bg-gold/10 text-gold border-gold/20",
  Active: "bg-success/10 text-success border-success/20",
  Dormant: "bg-muted text-muted-foreground border-muted-foreground/20",
};

const Donors = () => {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<DonorTypeFilter>("all");
  const [onlyAtRisk, setOnlyAtRisk] = useState(false);

  // Always fetch both donor types server-side, then filter client-side
  // for snappy toggles between Monetary / In-Kind / All.
  const { data, isLoading, isError } = useQuery<SupporterRow[]>({
    queryKey: ["supporters", "donors"],
    queryFn: () =>
      apiFetch<SupporterRow[]>(
        `/api/supporters?types=${DONOR_TYPES.join(",")}`,
      ),
  });

  const supporters = data ?? [];

  const filtered = useMemo(() => {
    return supporters.filter((s) => {
      if (typeFilter !== "all" && s.supporterType !== typeFilter) return false;

      if (search.trim().length > 0) {
        const q = search.toLowerCase();
        const haystack = [
          displayName(s),
          s.email ?? "",
          s.organizationName ?? "",
          s.region ?? "",
          s.country ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      if (onlyAtRisk) {
        const risk = computeRisk(s);
        if (risk !== "At risk" && risk !== "Watch") return false;
      }
      return true;
    });
  }, [supporters, typeFilter, search, onlyAtRisk]);

  // Summary counts for the type pills
  const counts = useMemo(
    () => ({
      all: supporters.length,
      MonetaryDonor: supporters.filter((s) => s.supporterType === "MonetaryDonor")
        .length,
      InKindDonor: supporters.filter((s) => s.supporterType === "InKindDonor")
        .length,
    }),
    [supporters],
  );

  return (
    <DashboardLayout title="Donor Management">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search donors..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            variant={onlyAtRisk ? "default" : "outline"}
            size="sm"
            onClick={() => setOnlyAtRisk((v) => !v)}
          >
            <Filter className="w-4 h-4 mr-1" /> At-risk
          </Button>
        </div>
        <Button variant="hero" size="sm">
          <Plus className="w-4 h-4 mr-1" /> Add donor
        </Button>
      </div>

      {/* Type filter pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button
          size="sm"
          variant={typeFilter === "all" ? "default" : "outline"}
          onClick={() => setTypeFilter("all")}
        >
          All donors ({counts.all})
        </Button>
        <Button
          size="sm"
          variant={typeFilter === "MonetaryDonor" ? "default" : "outline"}
          onClick={() => setTypeFilter("MonetaryDonor")}
        >
          Monetary ({counts.MonetaryDonor})
        </Button>
        <Button
          size="sm"
          variant={typeFilter === "InKindDonor" ? "default" : "outline"}
          onClick={() => setTypeFilter("InKindDonor")}
        >
          In-Kind ({counts.InKindDonor})
        </Button>
      </div>

      {/* States */}
      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading donors…</p>
      )}
      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          Could not load donors from the server.
        </div>
      )}
      {!isLoading && !isError && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No donors match the current filters.
        </p>
      )}

      {/* Result header */}
      {!isLoading && !isError && filtered.length > 0 && (
        <p className="text-xs text-muted-foreground mb-2">
          Showing {filtered.length} of {supporters.length} donors
        </p>
      )}

      {/* Cards */}
      <div className="grid gap-4">
        {filtered.map((s) => {
          const risk = computeRisk(s);
          const typeLabel = TYPE_LABELS[s.supporterType] ?? s.supporterType;
          return (
            <Card
              key={s.supporterId}
              className="rounded-xl shadow-sm hover:shadow-md transition-shadow"
            >
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-full bg-primary-light flex items-center justify-center text-primary font-semibold">
                      {initials(s)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{displayName(s)}</p>
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase tracking-wide"
                        >
                          {typeLabel}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {s.email ?? "—"}
                        {s.region ? ` · ${s.region}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-right">
                      <p className="font-semibold">
                        {formatCurrency(s.totalDonated)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s.donationCount} gift{s.donationCount === 1 ? "" : "s"}
                        {s.lastGiftDate
                          ? ` · last ${s.lastGiftDate.slice(0, 10)}`
                          : ""}
                      </p>
                    </div>
                    <Badge variant="outline" className={riskColor[risk]}>
                      {risk}
                    </Badge>
                    <Button size="sm" variant="ghost">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </DashboardLayout>
  );
};

export default Donors;
