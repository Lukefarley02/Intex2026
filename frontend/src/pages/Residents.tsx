import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, UserCircle } from "lucide-react";

const residents = [
  { id: "R-001", firstName: "Joy", safehouse: "Casa Esperanza", entryDate: "2025-06-12", status: "Active", stage: "Program" },
  { id: "R-002", firstName: "Grace", safehouse: "Casa Esperanza", entryDate: "2025-08-03", status: "Active", stage: "Program" },
  { id: "R-003", firstName: "Hope", safehouse: "Haven of Hope", entryDate: "2025-03-19", status: "Transitioning", stage: "Exit prep" },
  { id: "R-004", firstName: "Faith", safehouse: "Haven of Hope", entryDate: "2024-11-07", status: "Exited", stage: "Follow-up" },
  { id: "R-005", firstName: "Lily", safehouse: "Sunrise Home", entryDate: "2026-01-15", status: "Active", stage: "Intake" },
  { id: "R-006", firstName: "Rose", safehouse: "Safe Harbor", entryDate: "2025-09-22", status: "Active", stage: "Program" },
];

const statusColor: Record<string, string> = {
  Active: "bg-success/10 text-success border-success/20",
  Transitioning: "bg-gold/10 text-gold border-gold/20",
  Exited: "bg-muted text-muted-foreground",
  "Follow-up": "bg-secondary/10 text-secondary border-secondary/20",
};

const stageSteps = ["Intake", "Program", "Exit prep", "Follow-up"];

const Residents = () => {
  const [search, setSearch] = useState("");
  const filtered = residents.filter(r => r.firstName.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase()));

  return (
    <DashboardLayout title="Residents">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name or ID..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button variant="hero" size="sm"><Plus className="w-4 h-4 mr-1" /> Add resident</Button>
      </div>

      <div className="grid gap-4">
        {filtered.map((r) => {
          const stageIndex = stageSteps.indexOf(r.stage);
          return (
            <Card key={r.id} className="rounded-xl shadow-sm">
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-full bg-secondary/10 flex items-center justify-center">
                      <UserCircle className="w-6 h-6 text-secondary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{r.firstName}</p>
                        <span className="text-xs text-muted-foreground">({r.id})</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{r.safehouse} · Since {r.entryDate}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={statusColor[r.status] || ""}>{r.status}</Badge>
                  </div>
                </div>

                {/* Progress tracker */}
                <div className="mt-4 flex items-center gap-1">
                  {stageSteps.map((step, i) => (
                    <div key={step} className="flex-1">
                      <div className={`h-1.5 rounded-full ${i <= stageIndex ? "bg-success" : "bg-muted"}`} />
                      <p className={`text-[10px] mt-1 ${i <= stageIndex ? "text-success font-medium" : "text-muted-foreground"}`}>{step}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </DashboardLayout>
  );
};

export default Residents;
