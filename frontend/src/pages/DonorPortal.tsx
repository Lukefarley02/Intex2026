import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Download, Calendar, DollarSign } from "lucide-react";

const givingHistory = [
  { date: "2026-04-01", amount: 50, type: "Monthly" },
  { date: "2026-03-01", amount: 50, type: "Monthly" },
  { date: "2026-02-01", amount: 50, type: "Monthly" },
  { date: "2026-01-01", amount: 50, type: "Monthly" },
  { date: "2025-12-25", amount: 100, type: "One-time" },
  { date: "2025-12-01", amount: 50, type: "Monthly" },
];

const totalGiven = givingHistory.reduce((s, g) => s + g.amount, 0);

const DonorPortal = () => (
  <DashboardLayout title="My Impact">
    {/* Welcome */}
    <div className="gradient-warm rounded-xl p-8 mb-6">
      <h2 className="text-2xl font-bold mb-2">Welcome back, Lisa 💛</h2>
      <p className="text-muted-foreground">Thank you for your incredible generosity. Here's how your giving is making a difference.</p>
    </div>

    <div className="grid sm:grid-cols-3 gap-4 mb-6">
      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-5 text-center">
          <DollarSign className="w-6 h-6 text-gold mx-auto mb-2" />
          <p className="text-2xl font-bold">${totalGiven}</p>
          <p className="text-sm text-muted-foreground">Total given</p>
        </CardContent>
      </Card>
      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-5 text-center">
          <Heart className="w-6 h-6 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold">4</p>
          <p className="text-sm text-muted-foreground">Girls supported</p>
        </CardContent>
      </Card>
      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-5 text-center">
          <Calendar className="w-6 h-6 text-secondary mx-auto mb-2" />
          <p className="text-2xl font-bold">6</p>
          <p className="text-sm text-muted-foreground">Months giving</p>
        </CardContent>
      </Card>
    </div>

    <div className="grid lg:grid-cols-2 gap-6">
      {/* Giving history */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Giving history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {givingHistory.map((g, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p className="text-sm font-medium">${g.amount}</p>
                <p className="text-xs text-muted-foreground">{g.date}</p>
              </div>
              <Badge variant="outline">{g.type}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Impact stories */}
      <div className="space-y-6">
        <Card className="rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Your impact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-success/5 border border-success/20">
              <p className="text-sm font-medium text-success mb-1">🎓 Program Completion</p>
              <p className="text-sm text-muted-foreground">
                A girl you helped support completed her education program this March and is now preparing for independent living. Your monthly gifts made this possible.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-primary-light">
              <p className="text-sm">
                Your gifts this year have supported <strong>4 girls</strong> across 2 safehouses, providing shelter, education, and counseling.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Tax receipts</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" /> Download 2025 receipt</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  </DashboardLayout>
);

export default DonorPortal;
