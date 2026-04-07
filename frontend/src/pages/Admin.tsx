import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, Shield, TrendingUp, Home, UserPlus, Settings } from "lucide-react";

const users = [
  { name: "Admin User", email: "admin@ember.org", role: "Admin", status: "Active" },
  { name: "Maria Manager", email: "maria@ember.org", role: "Manager", status: "Active" },
  { name: "Anna Cruz", email: "anna@ember.org", role: "Staff", status: "Active" },
  { name: "Rosa Lim", email: "rosa@ember.org", role: "Staff", status: "Active" },
  { name: "Lisa Gomez", email: "lisa@email.com", role: "Donor", status: "Active" },
  { name: "David Chen", email: "david@email.com", role: "Donor", status: "Inactive" },
];

const roleColor: Record<string, string> = {
  Admin: "bg-primary/10 text-primary border-primary/20",
  Manager: "bg-secondary/10 text-secondary border-secondary/20",
  Staff: "bg-gold/10 text-gold border-gold/20",
  Donor: "bg-success/10 text-success border-success/20",
};

const kpis = [
  { label: "Donor retention rate", value: 87, suffix: "%" },
  { label: "Safehouse utilization", value: 80, suffix: "%" },
  { label: "Program completion rate", value: 72, suffix: "%" },
];

const Admin = () => (
  <DashboardLayout title="Admin Panel">
    {/* KPIs */}
    <div className="grid sm:grid-cols-3 gap-4 mb-8">
      {kpis.map((k) => (
        <Card key={k.label} className="rounded-xl shadow-sm">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{k.label}</span>
              <TrendingUp className="w-4 h-4 text-success" />
            </div>
            <div className="text-3xl font-bold">{k.value}{k.suffix}</div>
            <Progress value={k.value} className="h-2" />
          </CardContent>
        </Card>
      ))}
    </div>

    {/* User management */}
    <Card className="rounded-xl shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="w-4 h-4" /> User management
        </CardTitle>
        <Button variant="hero" size="sm"><UserPlus className="w-4 h-4 mr-1" /> Add user</Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.email} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
                  {u.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <p className="text-sm font-medium">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className={roleColor[u.role]}>{u.role}</Badge>
                <Badge variant={u.status === "Active" ? "outline" : "secondary"} className={u.status === "Active" ? "bg-success/10 text-success border-success/20" : ""}>
                  {u.status}
                </Badge>
                <Button variant="ghost" size="sm"><Settings className="w-4 h-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </DashboardLayout>
);

export default Admin;
