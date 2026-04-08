import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/api/client";

const COLORS = [
  "#f97316", // primary orange
  "#0d9488", // secondary teal
  "#fbbf24", // gold
  "#fb923c", // orange-400
  "#2dd4bf", // teal-400
  "#fcd34d", // yellow-300
  "#94a3b8", // slate (Other)
];

interface CampaignSlice {
  name: string;
  amount: number;
}

interface DonationData {
  totalRaised: number;
  breakdown: CampaignSlice[];
}

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export default function DonationChart() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const { data, isLoading, isError } = useQuery<DonationData>({
    queryKey: ["public-donations"],
    queryFn: () => apiFetch<DonationData>("/api/public/donations"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
        Loading donation data…
      </div>
    );
  }

  if (isError || !data || data.breakdown.length === 0) {
    return null;
  }

  const { totalRaised, breakdown } = data;
  const active = activeIndex !== null ? breakdown[activeIndex] : null;
  const activePct = active
    ? ((active.amount / totalRaised) * 100).toFixed(1)
    : null;

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {/* Donut chart with absolute-positioned centre label */}
      <div className="relative w-full" style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={breakdown}
              cx="50%"
              cy="50%"
              innerRadius={85}
              outerRadius={125}
              dataKey="amount"
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              stroke="none"
              paddingAngle={2}
            >
              {breakdown.map((_, i) => (
                <Cell
                  key={i}
                  fill={COLORS[i % COLORS.length]}
                  opacity={activeIndex === null || activeIndex === i ? 1 : 0.45}
                  style={{ cursor: "pointer", transition: "opacity 0.2s" }}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [fmt(value), "Raised"]}
              contentStyle={{ borderRadius: 8, fontSize: 13 }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Centre label — absolutely overlaid so % coords don't matter */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
          style={{ paddingBottom: 4 }}
        >
          <span
            className="font-bold text-foreground transition-all"
            style={{ fontSize: 22, lineHeight: 1.2 }}
          >
            {active ? fmt(active.amount) : fmt(totalRaised)}
          </span>
          <span className="text-xs text-muted-foreground mt-0.5 text-center px-6 leading-tight">
            {active ? `${activePct}% · ${active.name}` : "Total Raised"}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
        {breakdown.map((item, i) => (
          <div
            key={item.name}
            className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none transition-opacity"
            style={{ opacity: activeIndex === null || activeIndex === i ? 1 : 0.4 }}
            onMouseEnter={() => setActiveIndex(i)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            {item.name}
          </div>
        ))}
      </div>
    </div>
  );
}
