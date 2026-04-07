import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Send, Filter } from "lucide-react";

const donors = [
  { id: 1, name: "Maria Santos", email: "maria@email.com", lastGift: "2026-01-15", total: 1240, risk: "At risk", status: "Active" },
  { id: 2, name: "James Cruz", email: "james@email.com", lastGift: "2026-01-22", total: 890, risk: "At risk", status: "Active" },
  { id: 3, name: "Ana Reyes", email: "ana@email.com", lastGift: "2026-02-05", total: 2100, risk: "Watch", status: "Active" },
  { id: 4, name: "Robert Tan", email: "robert@email.com", lastGift: "2026-02-20", total: 560, risk: "Watch", status: "Active" },
  { id: 5, name: "Lisa Gomez", email: "lisa@email.com", lastGift: "2026-03-28", total: 3400, risk: "Active", status: "Active" },
  { id: 6, name: "David Chen", email: "david@email.com", lastGift: "2026-04-01", total: 780, risk: "Active", status: "Active" },
  { id: 7, name: "Sarah Kim", email: "sarah@email.com", lastGift: "2026-03-15", total: 5200, risk: "Active", status: "Active" },
  { id: 8, name: "Michael Lim", email: "michael@email.com", lastGift: "2026-04-05", total: 150, risk: "Active", status: "New" },
];

const riskColor: Record<string, string> = {
  "At risk": "bg-primary/10 text-primary border-primary/20",
  Watch: "bg-gold/10 text-gold border-gold/20",
  Active: "bg-success/10 text-success border-success/20",
};

const Donors = () => {
  const [search, setSearch] = useState("");
  const [filterRisk, setFilterRisk] = useState(false);

  const filtered = donors.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase());
    const matchRisk = !filterRisk || d.risk === "At risk" || d.risk === "Watch";
    return matchSearch && matchRisk;
  });

  return (
    <DashboardLayout title="Donor Management">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search donors..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button
            variant={filterRisk ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterRisk(!filterRisk)}
          >
            <Filter className="w-4 h-4 mr-1" /> At-risk
          </Button>
        </div>
        <Button variant="hero" size="sm"><Plus className="w-4 h-4 mr-1" /> Add donor</Button>
      </div>

      <div className="grid gap-4">
        {filtered.map((d) => (
          <Card key={d.id} className="rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-full bg-primary-light flex items-center justify-center text-primary font-semibold">
                    {d.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <p className="font-semibold">{d.name}</p>
                    <p className="text-sm text-muted-foreground">{d.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-right">
                    <p className="font-semibold">${d.total.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Last: {d.lastGift}</p>
                  </div>
                  <Badge variant="outline" className={riskColor[d.risk]}>{d.risk}</Badge>
                  <Button size="sm" variant="ghost"><Send className="w-4 h-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default Donors;
