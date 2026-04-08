import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Plus,
  Send,
  Filter,
  Pencil,
  Trash2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/api/client";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useAuth } from "@/api/AuthContext";
import { toast } from "@/hooks/use-toast";

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

// Full supporter entity shape that POST/PUT expect. Matches
// backend/Models/Supporter.cs.
interface SupporterForm {
  supporterId: number;
  supporterType: string;
  displayName: string;
  organizationName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  region: string;
  relationshipType: string;
  acquisitionChannel: string;
  firstDonationDate: string | null;
  status: string;
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
const computeRisk = (
  s: SupporterRow,
): "Active" | "Watch" | "At risk" | "Dormant" => {
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

const emptyForm: SupporterForm = {
  supporterId: 0,
  supporterType: "MonetaryDonor",
  displayName: "",
  organizationName: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  country: "",
  region: "",
  relationshipType: "International",
  acquisitionChannel: "Website",
  firstDonationDate: null,
  status: "Active",
};

// yyyy-MM-dd helper for <input type="date">.
const toDateInput = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

// Fill the form from a SupporterRow (everything except aggregate fields).
const fromRow = (s: SupporterRow): SupporterForm => ({
  supporterId: s.supporterId,
  supporterType: s.supporterType,
  displayName: s.displayName ?? "",
  organizationName: s.organizationName ?? "",
  firstName: s.firstName ?? "",
  lastName: s.lastName ?? "",
  email: s.email ?? "",
  phone: s.phone ?? "",
  country: s.country ?? "",
  region: s.region ?? "",
  relationshipType: s.relationshipType ?? "International",
  acquisitionChannel: s.acquisitionChannel ?? "",
  firstDonationDate: s.firstDonationDate,
  status: s.status ?? "Active",
});

const toPayload = (f: SupporterForm) => ({
  supporterId: f.supporterId,
  supporterType: f.supporterType,
  displayName:
    f.displayName.trim() ||
    [f.firstName, f.lastName].filter(Boolean).join(" ").trim() ||
    f.organizationName.trim(),
  organizationName: f.organizationName.trim() || null,
  firstName: f.firstName.trim(),
  lastName: f.lastName.trim(),
  email: f.email.trim(),
  phone: f.phone.trim() || null,
  country: f.country.trim(),
  region: f.region.trim(),
  relationshipType: f.relationshipType.trim(),
  acquisitionChannel: f.acquisitionChannel.trim() || null,
  firstDonationDate: f.firstDonationDate
    ? new Date(f.firstDonationDate).toISOString()
    : null,
  status: f.status.trim() || null,
  createdAt: null,
});

const Donors = () => {
  const qc = useQueryClient();
  const { hasRole } = useAuth();
  // Staff is blocked from monetary/in-kind donors by the backend, so on
  // the Donors page (which only shows those two types) Staff gets no
  // write actions. Admins of all tiers (founder/regional/location) get
  // Add + Edit; only Founder's DELETE will actually succeed on the
  // backend, but we still expose the button to all Admins and let the
  // 403 come back through the toast error.
  const canWrite = hasRole("Admin");
  const canDelete = hasRole("Admin");

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

  // ---- Dialog state ----
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<SupporterForm>(emptyForm);
  const [toDelete, setToDelete] = useState<SupporterRow | null>(null);
  const isEditing = form.supporterId !== 0;

  const openCreate = () => {
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (row: SupporterRow) => {
    setForm(fromRow(row));
    setFormOpen(true);
  };

  const createMut = useMutation({
    mutationFn: (payload: SupporterForm) =>
      apiFetch<SupporterRow>("/api/supporters", {
        method: "POST",
        body: JSON.stringify(toPayload(payload)),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supporters"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast({ title: "Donor created" });
      setFormOpen(false);
    },
    onError: (e: Error) =>
      toast({
        title: "Create failed",
        description: e.message,
        variant: "destructive",
      }),
  });

  const updateMut = useMutation({
    mutationFn: (payload: SupporterForm) =>
      apiFetch<void>(`/api/supporters/${payload.supporterId}`, {
        method: "PUT",
        body: JSON.stringify(toPayload(payload)),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supporters"] });
      toast({ title: "Donor updated" });
      setFormOpen(false);
    },
    onError: (e: Error) =>
      toast({
        title: "Update failed",
        description: e.message,
        variant: "destructive",
      }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) =>
      apiFetch<void>(`/api/supporters/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supporters"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast({ title: "Donor deleted" });
      setToDelete(null);
    },
    onError: (e: Error) =>
      toast({
        title: "Delete failed",
        description: e.message,
        variant: "destructive",
      }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() && !form.organizationName.trim()) {
      toast({
        title: "Name is required",
        description:
          "Enter either a first + last name or an organization name.",
        variant: "destructive",
      });
      return;
    }
    if (!form.email.trim()) {
      toast({ title: "Email is required", variant: "destructive" });
      return;
    }
    if (!form.region.trim() || !form.country.trim()) {
      toast({
        title: "Region and country are required",
        description:
          "Supporters must be tagged with a region for scope filtering to work.",
        variant: "destructive",
      });
      return;
    }
    if (isEditing) {
      updateMut.mutate(form);
    } else {
      createMut.mutate(form);
    }
  };

  const saving = createMut.isPending || updateMut.isPending;

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
        {canWrite && (
          <Button variant="hero" size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" /> Add donor
          </Button>
        )}
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
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Contact ${displayName(s)}`}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                    {canWrite && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEdit(s)}
                        aria-label={`Edit ${displayName(s)}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => setToDelete(s)}
                        aria-label={`Delete ${displayName(s)}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ---- Create / Edit dialog ---- */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit donor" : "New donor"}
            </DialogTitle>
            <DialogDescription>
              Donors page is restricted to Monetary and In-Kind supporter
              types. Other supporter categories (volunteers, partners,
              advocates) are managed elsewhere.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="d-type">Donor type</Label>
                <select
                  id="d-type"
                  className="w-full border rounded-md h-10 px-3 bg-background"
                  value={form.supporterType}
                  onChange={(e) =>
                    setForm({ ...form, supporterType: e.target.value })
                  }
                >
                  <option value="MonetaryDonor">Monetary</option>
                  <option value="InKindDonor">In-Kind</option>
                </select>
              </div>
              <div>
                <Label htmlFor="d-relationship">Relationship</Label>
                <select
                  id="d-relationship"
                  className="w-full border rounded-md h-10 px-3 bg-background"
                  value={form.relationshipType}
                  onChange={(e) =>
                    setForm({ ...form, relationshipType: e.target.value })
                  }
                >
                  <option>International</option>
                  <option>Domestic</option>
                  <option>Corporate</option>
                  <option>Foundation</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="d-first">First name</Label>
                <Input
                  id="d-first"
                  value={form.firstName}
                  onChange={(e) =>
                    setForm({ ...form, firstName: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="d-last">Last name</Label>
                <Input
                  id="d-last"
                  value={form.lastName}
                  onChange={(e) =>
                    setForm({ ...form, lastName: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="d-org">Organization (if applicable)</Label>
              <Input
                id="d-org"
                value={form.organizationName}
                onChange={(e) =>
                  setForm({ ...form, organizationName: e.target.value })
                }
                placeholder="e.g. Acme Foundation"
              />
            </div>

            <div>
              <Label htmlFor="d-display">Display name (optional)</Label>
              <Input
                id="d-display"
                value={form.displayName}
                onChange={(e) =>
                  setForm({ ...form, displayName: e.target.value })
                }
                placeholder="Defaults to first + last or org name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="d-email">Email *</Label>
                <Input
                  id="d-email"
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="d-phone">Phone</Label>
                <Input
                  id="d-phone"
                  value={form.phone}
                  onChange={(e) =>
                    setForm({ ...form, phone: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="d-region">Region *</Label>
                <Input
                  id="d-region"
                  value={form.region}
                  onChange={(e) =>
                    setForm({ ...form, region: e.target.value })
                  }
                  placeholder="e.g. West"
                  required
                />
              </div>
              <div>
                <Label htmlFor="d-country">Country *</Label>
                <Input
                  id="d-country"
                  value={form.country}
                  onChange={(e) =>
                    setForm({ ...form, country: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="d-channel">Acquisition channel</Label>
                <Input
                  id="d-channel"
                  value={form.acquisitionChannel}
                  onChange={(e) =>
                    setForm({ ...form, acquisitionChannel: e.target.value })
                  }
                  placeholder="e.g. Website, Event, Referral"
                />
              </div>
              <div>
                <Label htmlFor="d-status">Status</Label>
                <select
                  id="d-status"
                  className="w-full border rounded-md h-10 px-3 bg-background"
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value })
                  }
                >
                  <option>Active</option>
                  <option>Lapsed</option>
                  <option>Inactive</option>
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="d-first-gift">First donation date</Label>
              <Input
                id="d-first-gift"
                type="date"
                value={toDateInput(form.firstDonationDate)}
                onChange={(e) =>
                  setForm({
                    ...form,
                    firstDonationDate: e.target.value
                      ? new Date(e.target.value).toISOString()
                      : null,
                  })
                }
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving
                  ? "Saving…"
                  : isEditing
                    ? "Save changes"
                    : "Create donor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ---- Delete confirmation ---- */}
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => {
          if (!v) setToDelete(null);
        }}
        title="Delete donor?"
        description={
          toDelete
            ? `This permanently removes ${displayName(toDelete)} from the supporters list. Existing donation rows linked to this supporter will be orphaned. Only Founders can complete this action. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete donor"
        loading={deleteMut.isPending}
        onConfirm={() => {
          if (toDelete) deleteMut.mutate(toDelete.supporterId);
        }}
      />
    </DashboardLayout>
  );
};

export default Donors;
