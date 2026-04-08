import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/api/client";
import { Printer, ArrowLeft } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────
// Tax receipt / written acknowledgment letter
//
// Per IRS Publication 1771, to claim a charitable deduction on a cash gift
// a donor must keep a "contemporaneous written acknowledgment" from the
// charity. There is no numbered IRS form for this — every US nonprofit
// issues its own letter. The donor then attaches the total to Schedule A
// (Form 1040) at tax time. Form 8283 only applies to *non-cash* gifts over
// $500, which this page does not collect.
//
// This page pulls the live donation history from /api/donorportal/me/tax-receipt
// and renders a print-friendly letter. Clicking "Print / Save as PDF"
// opens the browser print dialog; saving to PDF is a native OS feature.
// ─────────────────────────────────────────────────────────────────────────

interface TaxReceiptData {
  organization: {
    name: string;
    legalName: string;
    ein: string;
    address1: string;
    address2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    email: string;
    phone: string;
    website: string;
  };
  donor: {
    supporterId: number;
    displayName: string;
    firstName: string;
    lastName: string;
    email: string;
    country: string;
    region: string;
  };
  taxYear: number;
  availableYears: number[];
  issueDate: string;
  currencyCode: string;
  totalAmount: number;
  donationCount: number;
  donations: Array<{
    donationId: number;
    donationDate: string | null;
    donationType: string | null;
    amount: number | null;
    estimatedValue: number | null;
    campaignName: string | null;
    isRecurring: boolean | null;
    currencyCode: string | null;
  }>;
  disclosure: string;
  formReference: string;
}

const formatCurrency = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const TaxReceipt = () => {
  // Default to the most recently completed tax year (previous calendar year).
  const defaultYear = new Date().getFullYear() - 1;
  const [year, setYear] = useState<number>(defaultYear);

  const { data, isLoading, isError } = useQuery<TaxReceiptData>({
    queryKey: ["tax-receipt", year],
    queryFn: () => apiFetch<TaxReceiptData>(`/api/donorportal/me/tax-receipt?year=${year}`),
  });

  // Build a unique list of year options: what the backend reports + the
  // current year + previous year, so donors can always pick a sane range.
  const yearOptions = useMemo(() => {
    const base = new Set<number>([
      new Date().getFullYear(),
      new Date().getFullYear() - 1,
    ]);
    data?.availableYears.forEach((y) => base.add(y));
    return Array.from(base).sort((a, b) => b - a);
  }, [data]);

  // If the backend tells us a newer year is available after the first load,
  // snap to that so the donor immediately sees data instead of a blank page.
  useEffect(() => {
    if (
      data &&
      data.donationCount === 0 &&
      data.availableYears.length > 0 &&
      !data.availableYears.includes(year)
    ) {
      setYear(data.availableYears[0]);
    }
  }, [data, year]);

  const handlePrint = () => window.print();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8 text-center text-muted-foreground">
        Loading your tax receipt…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-background p-8 text-center">
        <p className="text-destructive">
          We couldn't load your tax receipt. Please try again or contact support.
        </p>
        <Link to="/my-impact">
          <Button variant="ghost" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to donor portal
          </Button>
        </Link>
      </div>
    );
  }

  const { organization, donor, disclosure, formReference, totalAmount, donationCount, donations, issueDate } = data;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Print toolbar — hidden on print */}
      <div className="sticky top-0 z-10 bg-card border-b shadow-sm print:hidden">
        <div className="container flex items-center justify-between gap-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/my-impact">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" /> Donor portal
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <label htmlFor="tax-year" className="text-sm font-medium">
                Tax year:
              </label>
              <select
                id="tax-year"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="border rounded-md px-2 py-1 text-sm bg-background"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button variant="hero" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" /> Print / Save as PDF
          </Button>
        </div>
      </div>

      {/* Printable letter */}
      <div className="container max-w-3xl py-8 print:py-0">
        <div className="bg-white text-black rounded-lg shadow-sm print:shadow-none print:rounded-none p-10 print:p-0 space-y-6">
          {/* Letterhead */}
          <div className="border-b pb-4">
            <h1 className="text-2xl font-bold text-orange-600">{organization.name}</h1>
            <p className="text-sm text-gray-600">{organization.legalName}</p>
            <p className="text-xs text-gray-600 mt-1">
              {organization.address1}
              {organization.address2 ? `, ${organization.address2}` : ""}
              {" · "}
              {organization.city}, {organization.state} {organization.postalCode}
              {" · "}
              {organization.country}
            </p>
            <p className="text-xs text-gray-600">
              {organization.phone} · {organization.email} · {organization.website}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              EIN: {organization.ein}
            </p>
          </div>

          {/* Title */}
          <div className="text-center">
            <h2 className="text-xl font-bold uppercase tracking-wide">
              Written Acknowledgment of Charitable Contribution
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              For tax year {data.taxYear}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Issued {formatDate(issueDate)}
            </p>
          </div>

          {/* Donor block */}
          <div>
            <p className="text-sm text-gray-600 uppercase tracking-wide font-semibold mb-1">Donor</p>
            <p className="font-semibold">{donor.displayName}</p>
            <p className="text-sm">{donor.email}</p>
            {(donor.region || donor.country) && (
              <p className="text-sm text-gray-600">
                {[donor.region, donor.country].filter(Boolean).join(", ")}
              </p>
            )}
          </div>

          {/* Salutation + body */}
          <div className="text-sm leading-relaxed space-y-3">
            <p>Dear {donor.firstName || donor.displayName || "Friend"},</p>
            <p>
              Thank you for your generous support of {organization.name} during{" "}
              {data.taxYear}. Your contributions make it possible for us to
              protect, nurture, and restore the lives of vulnerable girls in our
              safehouses. This letter serves as your official written
              acknowledgment of the charitable contributions listed below.
            </p>
          </div>

          {/* Donations table */}
          {donationCount === 0 ? (
            <div className="border rounded-md p-4 text-sm text-gray-600 bg-gray-50">
              No donations are recorded for this tax year. Select a different year
              from the toolbar above.
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-600 uppercase tracking-wide font-semibold mb-2">
                Contributions ({donationCount})
              </p>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 font-semibold">Date</th>
                    <th className="py-2 font-semibold">Campaign / Fund</th>
                    <th className="py-2 font-semibold">Type</th>
                    <th className="py-2 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {donations.map((d) => (
                    <tr key={d.donationId} className="border-b">
                      <td className="py-2">{formatDate(d.donationDate)}</td>
                      <td className="py-2">{d.campaignName || "General Fund"}</td>
                      <td className="py-2">
                        {d.donationType || "Monetary"}
                        {d.isRecurring ? " · Recurring" : ""}
                      </td>
                      <td className="py-2 text-right font-mono">
                        {formatCurrency(Number(d.amount ?? d.estimatedValue ?? 0))}
                      </td>
                    </tr>
                  ))}
                  <tr className="font-bold">
                    <td className="py-3" colSpan={3}>
                      Total contributions for {data.taxYear}
                    </td>
                    <td className="py-3 text-right font-mono">
                      {formatCurrency(totalAmount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* IRS disclosure */}
          <div className="border-t pt-4 text-xs text-gray-700 leading-relaxed space-y-2">
            <p>
              <strong>IRS disclosure:</strong> {disclosure}
            </p>
            <p>{formReference}</p>
            <p className="text-gray-500">
              Keep this letter with your tax records. This acknowledgment is
              provided in accordance with IRS Publication 1771 for cash
              contributions to a qualified 501(c)(3) organization.
            </p>
          </div>

          {/* Signature */}
          <div className="pt-6">
            <p className="text-sm">With deep gratitude,</p>
            <p className="mt-6 font-semibold">Ember Donor Services</p>
            <p className="text-xs text-gray-500">{organization.email}</p>
          </div>
        </div>
      </div>

      {/* Print-only tweaks: strip background chrome so only the letter prints */}
      <style>{`
        @media print {
          body { background: white !important; }
          .container { max-width: none !important; padding: 0 !important; }
        }
      `}</style>
    </div>
  );
};

export default TaxReceipt;
