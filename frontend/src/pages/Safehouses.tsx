import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Home, MapPin, Users, UserCircle, Plus } from "lucide-react";

const safehouses = [
  { id: 1, name: "Casa Esperanza", location: "Cebu City", capacity: 12, current: 9, staff: "Anna Cruz", status: "Active" },
  { id: 2, name: "Haven of Hope", location: "Manila", capacity: 15, current: 14, staff: "Rosa Lim", status: "Near capacity" },
  { id: 3, name: "Sunrise Home", location: "Davao", capacity: 10, current: 7, staff: "Joy Santos", status: "Active" },
  { id: 4, name: "Safe Harbor", location: "Iloilo", capacity: 8, current: 6, staff: "Grace Tan", status: "Active" },
];

const Safehouses = () => (
  <DashboardLayout title="Safehouse Management">
    <div className="flex items-center justify-between mb-6">
      <p className="text-muted-foreground text-sm">{safehouses.length} active safehouses</p>
      <Button variant="hero" size="sm"><Plus className="w-4 h-4 mr-1" /> Add safehouse</Button>
    </div>

    <div className="grid sm:grid-cols-2 gap-5">
      {safehouses.map((sh) => {
        const pct = (sh.current / sh.capacity) * 100;
        return (
          <Card key={sh.id} className="rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Home className="w-4 h-4 text-secondary" /> {sh.name}
                </CardTitle>
                <Badge variant="outline" className={pct > 90 ? "bg-primary/10 text-primary border-primary/20" : "bg-success/10 text-success border-success/20"}>
                  {sh.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" /> {sh.location}
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Residents</span>
                  <span className="font-medium">{sh.current}/{sh.capacity}</span>
                </div>
                <Progress value={pct} className="h-2.5" />
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <UserCircle className="w-4 h-4" /> Staff: {sh.staff}
              </div>

              <Button variant="outline" size="sm" className="w-full">View details</Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  </DashboardLayout>
);

export default Safehouses;
