// PrintTable — hidden on screen, rendered as a clean table when printing.
//
// Usage:
//   <PrintTable
//     columns={[
//       { header: "Name", accessor: (r) => r.name },
//       { header: "Status", accessor: (r) => r.status },
//     ]}
//     data={filtered}
//     keyAccessor={(r) => r.id}
//   />

interface PrintColumn<T> {
  header: string;
  accessor: (row: T) => React.ReactNode;
  /** Optional: right-align numeric columns */
  align?: "left" | "right" | "center";
}

interface PrintTableProps<T> {
  columns: PrintColumn<T>[];
  data: T[];
  keyAccessor: (row: T) => string | number;
}

function PrintTable<T>({ columns, data, keyAccessor }: PrintTableProps<T>) {
  return (
    <div className="hidden print:block mt-4">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th
                key={i}
                className={`border border-gray-300 bg-gray-100 px-2 py-1.5 font-semibold text-gray-700 ${
                  col.align === "right"
                    ? "text-right"
                    : col.align === "center"
                    ? "text-center"
                    : "text-left"
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={keyAccessor(row)}>
              {columns.map((col, i) => (
                <td
                  key={i}
                  className={`border border-gray-200 px-2 py-1 ${
                    col.align === "right"
                      ? "text-right"
                      : col.align === "center"
                      ? "text-center"
                      : "text-left"
                  }`}
                >
                  {col.accessor(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default PrintTable;
export type { PrintColumn };
