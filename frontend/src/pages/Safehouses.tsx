import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Home, MapPin, Users, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/api/client";

// ---- Types matching /api/safehouses projection ----
interface SafehouseRow {
  safehouseId: number;
  safehouseCode: string | null;
  name: string;
  region: string | null;
  province: string | null;
  city: string | null;
  country: string | null;
  status: string | null;
  openDate: string | null;
  capacityGirls: number | null;
  capacityStaff: number | null;
  storedOccupancy: number | null;
  activeResidents: number;
}

const formatLocation = (sh: SafehouseRow) => {
  const parts = [sh.city, sh.province ?? sh.region, sh.country].filter(
    (p): p is string => !!p && p.trim().length > 0,
  );
  return parts.length > 0 ? parts.join(", ") : "Location not set";
};

const Safehouses = () => {
  const { data, isLoading, isError } = useQuery<SafehouseRow[]>({
    queryKey: ["safehouses"],
    queryFn: () => apiFetch<SafehouseRow[]>("/api/safehouses"),
  });

  const safehouses = data ?? [];

  return (
    <DashboardLayout title="Safehouse Management">
      <div className="flex items-center justify-between mb-6">
        <p className="text-muted-foreground text-sm">
          {isLoading
            ? "Loading safehouses…"
            : `${safehouses.length} safehouse${safehouses.length === 1 ? "" : "s"}`}
        </p>
        <Button variant="hero" size="sm">
          <Plus className="w-4 h-4 mr-1" /> Add safehouse
        </Button>
      </div>

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive mb-4">
          Could not load safehouses from the server.
        </div>
      )}

      {!isLoading && !isError && safehouses.length === 0 && (
        <p className="text-sm text-muted-foreground">No safehouses found.</p>
      )}

      <div className="grid sm:grid-cols-2 gap-5">
        {safehouses.map((sh) => {
          const capacity = sh.capacityGirls ?? 0;
          const current = sh.activeResidents ?? sh.storedOccupancy ?? 0;
          const pct = capacity > 0 ? Math.min((current / capacity) * 100, 100) : 0;
          const nearCapacity = capacity > 0 && current / capacity > 0.9;
          const displayStatus =
            sh.status || (nearCapacity ? "Near capacity" : "Active");

          return (
            <Card
              key={sh.safehouseId}
              className="rounded-xl shadow-sm hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Home className="w-4 h-4 text-secondary" /> {sh.name}
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className={
                      nearCapacity
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-success/10 text-success border-success/20"
                    }
                  >
                    {displayStatus}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" /> {formatLocation(sh)}
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> Residents
                    </span>
                    <span className="font-medium">
                      {current}
                      {capacity > 0 ? `/${capacity}` : ""}
                    </span>
                  </div>
                  <Progress value={pct} className="h-2.5" />
                </div>

                {sh.capacityStaff != null && (
                  <div className="text-sm text-muted-foreground">
                    Staff capacity: {sh.capacityStaff}
                  </div>
                )}

                <Button variant="outline" size="sm" className="w-full">
                  View details
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </DashboardLayout>
  );
};

export default Safehouses;
