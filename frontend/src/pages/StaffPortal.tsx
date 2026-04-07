import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Send, Check } from "lucide-react";
import { useState } from "react";

const pastLogs = [
  { week: "Mar 24–30", safehouse: "Casa Esperanza", residents: 9, intakes: 1, exits: 0, status: "Submitted" },
  { week: "Mar 17–23", safehouse: "Casa Esperanza", residents: 8, intakes: 0, exits: 0, status: "Submitted" },
  { week: "Mar 10–16", safehouse: "Casa Esperanza", residents: 8, intakes: 1, exits: 1, status: "Submitted" },
];

const StaffPortal = () => {
  const [submitted, setSubmitted] = useState(false);

  return (
    <DashboardLayout title="Staff Portal">
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Weekly check-in form */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-secondary" /> Weekly check-in
            </CardTitle>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="text-center py-8 space-y-3">
                <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                  <Check className="w-7 h-7 text-success" />
                </div>
                <p className="font-semibold">Check-in submitted!</p>
                <Button variant="outline" size="sm" onClick={() => setSubmitted(false)}>Submit another</Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Current residents</Label>
                    <Input type="number" defaultValue={9} />
                  </div>
                  <div className="space-y-2">
                    <Label>Week of</Label>
                    <Input type="date" defaultValue="2026-03-31" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>New intakes</Label>
                    <Input type="number" defaultValue={0} />
                  </div>
                  <div className="space-y-2">
                    <Label>Exits this week</Label>
                    <Input type="number" defaultValue={0} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Program updates / Completions</Label>
                  <Textarea placeholder="Any milestones, completions, or notable progress..." rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Notes / Flags for manager</Label>
                  <Textarea placeholder="Any concerns or items needing attention..." rows={2} />
                </div>
                <Button variant="hero" className="w-full" onClick={() => setSubmitted(true)}>
                  <Send className="w-4 h-4 mr-1" /> Submit check-in
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Past submissions */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Submission history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pastLogs.map((log) => (
              <div key={log.week} className="p-3 rounded-lg border space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{log.week}</p>
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20">{log.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {log.residents} residents · {log.intakes} intakes · {log.exits} exits
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default StaffPortal;
