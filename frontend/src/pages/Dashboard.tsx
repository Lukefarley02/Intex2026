import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Users, AlertTriangle, HeartHandshake, FileText, Plus, Send, UserPlus, Clock } from "lucide-react";

const metrics = [
  { label: "Active donors", value: "124", icon: HeartHandshake, change: "+8 this month" },
  { label: "At-risk donors", value: "17", icon: AlertTriangle, change: "60–90 days inactive", alert: true },
  { label: "Girls supported", value: "43", icon: Users, change: "across 4 safehouses" },
  { label: "Pending reports", value: "3", icon: FileText, change: "due this week" },
];

const lapseAlerts = [
  { name: "Maria Santos", lastGift: "72 days ago", total: "$1,240", risk: "At risk" },
  { name: "James Cruz", lastGift: "65 days ago", total: "$890", risk: "At risk" },
  { name: "Ana Reyes", lastGift: "58 days ago", total: "$2,100", risk: "Watch" },
  { name: "Robert Tan", lastGift: "45 days ago", total: "$560", risk: "Watch" },
];

const safehouses = [
  { name: "Casa Esperanza", current: 9, capacity: 12 },
  { name: "Haven of Hope", current: 14, capacity: 15 },
  { name: "Sunrise Home", current: 7, capacity: 10 },
  { name: "Safe Harbor", current: 6, capacity: 8 },
];

const activities = [
  { text: "Weekly log submitted by Staff Anna — Casa Esperanza", time: "2h ago" },
  { text: "New donation: $50 from Maria Santos", time: "5h ago" },
  { text: "Resident intake: Girl #247 — Haven of Hope", time: "1d ago" },
  { text: "Impact report generated for Q1 2026", time: "2d ago" },
];

const riskColor: Record<string, string> = {
  "At risk": "bg-primary/10 text-primary border-primary/20",
  Watch: "bg-gold/10 text-gold border-gold/20",
  Active: "bg-success/10 text-success border-success/20",
};

const Dashboard = () => (
  <DashboardLayout title="Dashboard">
    {/* Metrics */}
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {metrics.map((m) => (
        <Card key={m.label} className={`rounded-xl shadow-sm ${m.alert ? "border-primary/30" : ""}`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{m.label}</span>
              <m.icon className={`w-5 h-5 ${m.alert ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div className="text-3xl font-bold">{m.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{m.change}</p>
          </CardContent>
        </Card>
      ))}
    </div>

    <div className="grid lg:grid-cols-3 gap-6">
      {/* Lapse alerts */}
      <div className="lg:col-span-2">
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-primary" /> Donor lapse alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lapseAlerts.map((d) => (
                <div key={d.name} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
                      {d.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{d.name}</p>
                      <p className="text-xs text-muted-foreground">{d.lastGift} · {d.total} total</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={riskColor[d.risk]}>{d.risk}</Badge>
                    <Button size="sm" variant="outline" className="text-xs">
                      <Send className="w-3 h-3 mr-1" /> Reach out
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Safehouse capacity */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Safehouse capacity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {safehouses.map((sh) => (
            <div key={sh.name} className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{sh.name}</span>
                <span className="text-muted-foreground">{sh.current}/{sh.capacity}</span>
              </div>
              <Progress
                value={(sh.current / sh.capacity) * 100}
                className="h-2"
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>

    {/* Quick actions + activity */}
    <div className="grid lg:grid-cols-3 gap-6 mt-6">
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" className="w-full justify-start gap-2"><FileText className="w-4 h-4" /> New report</Button>
          <Button variant="outline" className="w-full justify-start gap-2"><Send className="w-4 h-4" /> Send update</Button>
          <Button variant="outline" className="w-full justify-start gap-2"><UserPlus className="w-4 h-4" /> Add donor</Button>
        </CardContent>
      </Card>

      <div className="lg:col-span-2">
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activities.map((a, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p>{a.text}</p>
                    <p className="text-xs text-muted-foreground">{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </DashboardLayout>
);

export default Dashboard;
