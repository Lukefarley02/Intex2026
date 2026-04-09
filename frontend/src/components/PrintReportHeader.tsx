// PrintReportHeader — rendered hidden on screen, visible only when printing.
//
// Wrap the content you want to print inside the page's normal JSX. This
// component sits at the top of every management page and prints as a clean
// letterhead-style header so each PDF has a consistent identity block,
// the report title, the applied filter set, and the record count.
//
// Usage:
//   <PrintReportHeader title="Residents" filters={activeFilters} count={filtered.length} />
//
// where activeFilters is an array of { label, value } pairs for any filter
// that is currently narrowed (omit pairs where value is "All" / any / "").

interface FilterChip {
  label: string;
  value: string;
}

interface PrintReportHeaderProps {
  title: string;
  /** Active filter chips to display. Only pass filters that are actually set. */
  filters?: FilterChip[];
  /** Total number of records shown (after filters applied). */
  count?: number;
  /** Optional subtitle / pipeline description for ML reports. */
  subtitle?: string;
}

const PrintReportHeader = ({
  title,
  filters = [],
  count,
  subtitle,
}: PrintReportHeaderProps) => {
  const now = new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="hidden print:block mb-6 pb-4 border-b border-gray-300">
      {/* Letterhead */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-0.5">
            Ember Foundation
          </p>
          <h1 className="text-2xl font-bold text-orange-600">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-600 mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className="text-right text-xs text-gray-500">
          <p className="font-medium">Generated</p>
          <p>{now}</p>
          {count !== undefined && (
            <p className="mt-1 font-semibold text-gray-700">
              {count} record{count !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

      {/* Active filters */}
      {filters.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="text-xs text-gray-500 font-medium self-center">
            Filters applied:
          </span>
          {filters.map((f) => (
            <span
              key={f.label}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-gray-300 text-xs text-gray-700 bg-gray-50"
            >
              <span className="text-gray-400">{f.label}:</span> {f.value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default PrintReportHeader;
