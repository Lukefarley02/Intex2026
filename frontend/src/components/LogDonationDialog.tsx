import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  DollarSign,
  Package,
  UserPlus,
  ArrowLeft,
  KeyRound,
  Copy,
  Check,
  ShieldCheck,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/api/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/api/AuthContext";

// ---------- Types ----------
//
// The supporter row shape matches /api/supporters (the same projection
// Donors.tsx uses). We only need a handful of fields here for display and
// matching so the interface is intentionally narrow.
interface SupporterRow {
  supporterId: number;
  supporterType: string;
  displayName: string | null;
  organizationName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  region: string | null;
  country: string | null;
  totalDonated: number;
  donationCount: number;
  lastGiftDate: string | null;
}

type DonationType = "Monetary" | "InKind";
type Step = "type" | "match" | "create" | "details" | "success";

// Shape of the /api/donations response. `tempPassword` and
// `donorAccountEmail` are populated only when the server created a brand
// new Identity account for a new donor with a valid email.
interface LogDonationResponse {
  donationId: number;
  supporterId: number;
  createdNewSupporter: boolean;
  tempPassword: string | null;
  donorAccountEmail: string | null;
}

// LogDonationDialog is the single source of truth for the in-person
// donation flow. It's used from:
//   - Donors.tsx (Admin header) — "Log donation" button
//   - StaffDashboard.tsx quick actions — Staff's only path to create a
//     MonetaryDonor or InKindDonor row
//
// The flow is:
//   1. Type: Monetary or In-Kind (defaults to In-Kind if the caller
//      passes `initialType="InKind"`).
//   2. Match: search existing donors. On pick, jump straight to details.
//      If nothing matches, the user clicks "Create new donor" which goes
//      to step 3.
//   3. Create: inline new-donor form (name, email optional, phone, region,
//      country). Region is prefilled from the caller's scope for
//      Staff/Regional/Location managers.
//   4. Details: amount (monetary) or estimated value + item description
//      (in-kind), date, campaign, optional notes, save.
//
// On save the dialog POSTs to /api/donations which may also create the
// supporter inline. React-query caches for ["supporters","donors"],
// ["dashboard"], and donor-portal data are all invalidated so every
// surface that reads donations or donor totals refreshes automatically.
interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialType?: DonationType;
}

const emptyNew = {
  firstName: "",
  lastName: "",
  organizationName: "",
  email: "",
  phone: "",
  country: "Philippines",
};

const today = () => new Date().toISOString().slice(0, 10);

const LogDonationDialog = ({ open, onOpenChange, initialType = "Monetary" }: Props) => {
  const qc = useQueryClient();
  const { user } = useAuth();

  // ---- wizard state ----
  const [step, setStep] = useState<Step>("type");
  const [donationType, setDonationType] = useState<DonationType>(initialType);
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<SupporterRow | null>(null);
  const [newDonor, setNewDonor] = useState({ ...emptyNew });
  // Details
  const [amount, setAmount] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [donationDate, setDonationDate] = useState(today());
  const [campaignName, setCampaignName] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [notes, setNotes] = useState("");
  // Success state: populated when the backend provisions a new Identity
  // account during the log-donation flow. Staff see the temp password once
  // and can copy it to clipboard to hand to the donor.
  const [successInfo, setSuccessInfo] = useState<{
    tempPassword: string | null;
    donorAccountEmail: string | null;
    createdNewSupporter: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset everything whenever the dialog is opened fresh.
  useEffect(() => {
    if (open) {
      setStep("type");
      setDonationType(initialType);
      setSearch("");
      setPicked(null);
      setNewDonor({ ...emptyNew });
      setAmount("");
      setEstimatedValue("");
      setDonationDate(today());
      setCampaignName("");
      setItemDescription("");
      setNotes("");
      setSuccessInfo(null);
      setCopied(false);
    }
  }, [open, initialType]);

  // ---- donor lookup ----
  //
  // We fetch the already-scoped list of supporters (Monetary + In-Kind)
  // once per open. For Staff this is region-clamped server-side, so
  // Staff only ever see donors in their region — matching the four-tier
  // access rules. Results are filtered client-side as the user types.
  const { data: supporters = [], isLoading: supportersLoading } = useQuery<SupporterRow[]>({
    queryKey: ["supporters", "log-donation-search"],
    queryFn: () =>
      apiFetch<SupporterRow[]>("/api/supporters?types=MonetaryDonor,InKindDonor"),
    enabled: open,
  });

  const displayName = (s: SupporterRow) =>
    s.displayName ||
    s.organizationName ||
    [s.firstName, s.lastName].filter(Boolean).join(" ") ||
    `Supporter #${s.supporterId}`;

  const filteredSupporters = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length === 0) return supporters.slice(0, 20);
    return supporters
      .filter((s) => {
        const hay = [
          displayName(s),
          s.email ?? "",
          s.phone ?? "",
          s.organizationName ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 40);
  }, [supporters, search]);

  // ---- mutation ----
  const mut = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        donationType,
        donationDate: new Date(donationDate).toISOString(),
        campaignName: campaignName.trim() || null,
        isRecurring: false,
      };
      if (donationType === "Monetary") {
        body.amount = Number(amount);
      } else {
        body.estimatedValue = Number(estimatedValue);
        // For in-kind we stash the item description in `notes` (see
        // DonationsController.cs — the in_kind_donation_items table is
        // not yet modeled, so notes is the canonical field).
        const parts: string[] = [];
        if (itemDescription.trim()) parts.push(itemDescription.trim());
        if (notes.trim()) parts.push(notes.trim());
        body.notes = parts.join(" — ") || null;
      }
      if (donationType === "Monetary" && notes.trim()) {
        body.notes = notes.trim();
      }
      if (picked) {
        body.supporterId = picked.supporterId;
      } else {
        body.newSupporter = {
          firstName: newDonor.firstName,
          lastName: newDonor.lastName,
          organizationName: newDonor.organizationName || null,
          email: newDonor.email,
          phone: newDonor.phone || null,
          country: newDonor.country,
          supporterType: donationType === "InKind" ? "InKindDonor" : "MonetaryDonor",
        };
      }
      return apiFetch<LogDonationResponse>("/api/donations", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["supporters"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["donorportal"] });

      // If the server also provisioned a new Identity account, we need to
      // surface the temp password to staff exactly once — hand it to the
      // donor on the spot. We transition to a dedicated success step with a
      // copy-to-clipboard button rather than closing the dialog.
      if (res.tempPassword && res.donorAccountEmail) {
        setSuccessInfo({
          tempPassword: res.tempPassword,
          donorAccountEmail: res.donorAccountEmail,
          createdNewSupporter: res.createdNewSupporter,
        });
        setStep("success");
        return;
      }

      toast({
        title: "Donation logged",
        description: res.createdNewSupporter
          ? "A new donor record was created and the gift was attached to it."
          : "The gift was attached to the existing donor record.",
      });
      onOpenChange(false);
    },
    onError: (e: Error) =>
      toast({
        title: "Could not log donation",
        description: e.message,
        variant: "destructive",
      }),
  });

  // ---- helpers ----
  const validateDetails = (): string | null => {
    if (donationType === "Monetary") {
      const n = Number(amount);
      if (!n || n <= 0) return "Enter a donation amount greater than zero.";
    } else {
      const n = Number(estimatedValue);
      if (!n || n <= 0) return "Enter an estimated monetary value greater than zero.";
      if (!itemDescription.trim()) return "Enter a description of the donated items.";
    }
    if (!donationDate) return "Select a donation date.";
    return null;
  };

  const validateNewDonor = (): string | null => {
    if (!newDonor.firstName.trim() && !newDonor.organizationName.trim()) {
      return "Enter a first name or an organization name.";
    }
    if (!newDonor.country.trim()) return "Country is required.";
    return null;
  };

  const handleSave = () => {
    const detailError = validateDetails();
    if (detailError) {
      toast({ title: detailError, variant: "destructive" });
      return;
    }
    if (!picked) {
      const newDonorError = validateNewDonor();
      if (newDonorError) {
        toast({ title: newDonorError, variant: "destructive" });
        return;
      }
    }
    mut.mutate();
  };

  const handleCopy = async () => {
    if (!successInfo?.tempPassword) return;
    try {
      await navigator.clipboard.writeText(successInfo.tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore — the value is still visible on screen */
    }
  };

  // ---- render ----
  const canGoBack = step !== "type" && step !== "success";
  const goBack = () => {
    if (step === "details") {
      setStep(picked ? "match" : "create");
    } else if (step === "create") {
      setStep("match");
    } else if (step === "match") {
      setStep("type");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {canGoBack && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="-ml-2 h-7 px-2"
                onClick={goBack}
                disabled={mut.isPending}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            Log donation
          </DialogTitle>
          <DialogDescription>
            {step === "type" && "Is this a cash gift or an in-kind (non-cash) donation?"}
            {step === "match" && "Search for an existing donor — or create a new record if this is their first gift."}
            {step === "create" && "Enter the new donor's details. Email is optional for in-person walk-in donors."}
            {step === "details" &&
              (donationType === "Monetary"
                ? "Enter the amount, date, and optional campaign."
                : "Enter an estimated monetary value, item description, date, and optional campaign.")}
            {step === "success" && "Donation saved. Share the one-time password below with the donor so they can access their portal."}
          </DialogDescription>
        </DialogHeader>

        {/* ---------------- Step 1: donation type ---------------- */}
        {step === "type" && (
          <div className="grid sm:grid-cols-2 gap-3 py-3">
            <button
              type="button"
              onClick={() => {
                setDonationType("Monetary");
                setStep("match");
              }}
              className={`text-left rounded-xl border p-4 hover:shadow-md transition-shadow ${
                donationType === "Monetary" ? "border-primary ring-2 ring-primary/20" : ""
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <div className="font-semibold">Monetary</div>
              </div>
              <p className="text-xs text-muted-foreground">
                Cash, check, or card handed to staff in person.
              </p>
            </button>
            <button
              type="button"
              onClick={() => {
                setDonationType("InKind");
                setStep("match");
              }}
              className={`text-left rounded-xl border p-4 hover:shadow-md transition-shadow ${
                donationType === "InKind" ? "border-primary ring-2 ring-primary/20" : ""
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-gold" />
                </div>
                <div className="font-semibold">In-Kind</div>
              </div>
              <p className="text-xs text-muted-foreground">
                Goods, supplies, or services. You'll enter an estimated value and a description.
              </p>
            </button>
          </div>
        )}

        {/* ---------------- Step 2: match donor ---------------- */}
        {step === "match" && (
          <div className="space-y-3 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className="rounded-md border max-h-64 overflow-y-auto divide-y">
              {supportersLoading && (
                <p className="text-sm text-muted-foreground p-3">Loading donors…</p>
              )}
              {!supportersLoading && filteredSupporters.length === 0 && (
                <p className="text-sm text-muted-foreground p-3">
                  {search.trim().length > 0
                    ? "No donors match that search."
                    : "No donors yet in your region."}
                </p>
              )}
              {filteredSupporters.map((s) => (
                <button
                  key={s.supporterId}
                  type="button"
                  onClick={() => {
                    setPicked(s);
                    setStep("details");
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-muted flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{displayName(s)}</span>
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {s.supporterType === "MonetaryDonor" ? "Monetary" : "In-Kind"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {s.email || "—"}
                      {s.region ? ` · ${s.region}` : ""}
                    </p>
                  </div>
                  <div className="text-xs text-right text-muted-foreground flex-shrink-0">
                    {s.donationCount} gift{s.donationCount === 1 ? "" : "s"}
                  </div>
                </button>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setStep("create")}
            >
              <UserPlus className="w-4 h-4 mr-2" /> Create new donor
            </Button>
          </div>
        )}

        {/* ---------------- Step 3: create donor ---------------- */}
        {step === "create" && (
          <div className="space-y-3 py-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="nd-first">First name</Label>
                <Input
                  id="nd-first"
                  value={newDonor.firstName}
                  onChange={(e) => setNewDonor({ ...newDonor, firstName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="nd-last">Last name</Label>
                <Input
                  id="nd-last"
                  value={newDonor.lastName}
                  onChange={(e) => setNewDonor({ ...newDonor, lastName: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="nd-org">Organization (if any)</Label>
              <Input
                id="nd-org"
                value={newDonor.organizationName}
                onChange={(e) => setNewDonor({ ...newDonor, organizationName: e.target.value })}
                placeholder="e.g. Acme Foundation"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="nd-email">Email (optional)</Label>
                <Input
                  id="nd-email"
                  type="email"
                  value={newDonor.email}
                  onChange={(e) => setNewDonor({ ...newDonor, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="nd-phone">Phone (optional)</Label>
                <Input
                  id="nd-phone"
                  value={newDonor.phone}
                  onChange={(e) => setNewDonor({ ...newDonor, phone: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="nd-country">Country</Label>
              <Input
                id="nd-country"
                value={newDonor.country}
                onChange={(e) => setNewDonor({ ...newDonor, country: e.target.value })}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Region is set automatically based on your assigned location
              {user?.email ? ` (${user.email})` : ""}. If you enter an email
              address, a donor portal account will be created with a
              one-time temporary password that you can share with them at
              the end of this flow — they'll be required to set a new
              password on first login.
            </p>
            <Button type="button" className="w-full" onClick={() => setStep("details")}>
              Next: donation details
            </Button>
          </div>
        )}

        {/* ---------------- Step 4: details ---------------- */}
        {step === "details" && (
          <div className="space-y-3 py-3">
            {picked ? (
              <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                <div className="font-medium">{displayName(picked)}</div>
                <div className="text-xs text-muted-foreground">
                  {picked.email || "no email on file"}
                  {picked.region ? ` · ${picked.region}` : ""}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                <div className="font-medium">
                  {newDonor.organizationName ||
                    [newDonor.firstName, newDonor.lastName].filter(Boolean).join(" ") ||
                    "New donor"}{" "}
                  <span className="text-xs text-muted-foreground">(new)</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {newDonor.email || "no email on file"}
                </div>
              </div>
            )}

            {donationType === "Monetary" ? (
              <div>
                <Label htmlFor="d-amount">Amount (USD) *</Label>
                <Input
                  id="d-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            ) : (
              <>
                <div>
                  <Label htmlFor="d-items">Item description *</Label>
                  <Input
                    id="d-items"
                    value={itemDescription}
                    onChange={(e) => setItemDescription(e.target.value)}
                    placeholder="e.g. 5 boxes of school supplies"
                  />
                </div>
                <div>
                  <Label htmlFor="d-est">Estimated monetary value (USD) *</Label>
                  <Input
                    id="d-est"
                    type="number"
                    min="0"
                    step="0.01"
                    value={estimatedValue}
                    onChange={(e) => setEstimatedValue(e.target.value)}
                    placeholder="0.00"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    For IRS Form 8283 compliance, the donor is ultimately
                    responsible for claiming fair-market value. This field
                    is used for internal reporting only.
                  </p>
                </div>
              </>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="d-date">Donation date *</Label>
                <Input
                  id="d-date"
                  type="date"
                  value={donationDate}
                  onChange={(e) => setDonationDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="d-campaign">Campaign (optional)</Label>
                <Input
                  id="d-campaign"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g. Spring Hope Drive"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="d-notes">
                {donationType === "InKind" ? "Additional notes (optional)" : "Notes (optional)"}
              </Label>
              <Input
                id="d-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* ---------------- Step 5: success + temp password ---------------- */}
        {step === "success" && successInfo && (
          <div className="space-y-4 py-3">
            <div className="rounded-lg border border-success/30 bg-success/10 p-4 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-foreground">Donation logged successfully.</p>
                <p className="text-muted-foreground">
                  A new account was created for{" "}
                  <span className="font-medium text-foreground">
                    {successInfo.donorAccountEmail}
                  </span>
                  . Share the one-time password below so they can sign in and
                  see their giving history. They'll be required to set a new
                  password the first time they log in.
                </p>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
              <Label className="flex items-center gap-2 text-xs uppercase tracking-wide">
                <KeyRound className="w-4 h-4" /> Temporary password
              </Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-md border bg-background px-3 py-2 font-mono text-base select-all break-all">
                  {successInfo.tempPassword}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="flex-shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-1.5" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1.5" /> Copy
                    </>
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                This password is shown only once — it is not stored in a
                recoverable form after you close this dialog. If the donor
                loses it, an admin can delete their account and re-issue one.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "success" ? (
            <Button type="button" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={mut.isPending}
              >
                Cancel
              </Button>
              {step === "details" && (
                <Button type="button" onClick={handleSave} disabled={mut.isPending}>
                  {mut.isPending ? "Saving…" : "Save donation"}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LogDonationDialog;
