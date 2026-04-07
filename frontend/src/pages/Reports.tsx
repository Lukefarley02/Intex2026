import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Plus, Download, Send, Eye } from "lucide-react";
import { useState } from "react";

const pastReports = [
  { id: 1, title: "Q1 2026 Impact Report", type: "Monthly", date: "2026-03-31", status: "Sent" },
  { id: 2, title: "February Safehouse Report", type: "Safehouse", date: "2026-02-28", status: "Sent" },
  { id: 3, title: "Donor Impact — Lisa Gomez", type: "Donor-specific", date: "2026-02-15", status: "Draft" },
  { id: 4, title: "January Monthly Report", type: "Monthly", date: "2026-01-31", status: "Sent" },
];

const Reports = () => {
  const [showBuilder, setShowBuilder] = useState(false);

  return (
    <DashboardLayout title="Impact Reports">
      <div className="flex items-center justify-between mb-6">
        <p className="text-muted-foreground text-sm">{pastReports.length} reports</p>
        <Button variant="hero" size="sm" onClick={() => setShowBuilder(!showBuilder)}>
          <Plus className="w-4 h-4 mr-1" /> New report
        </Button>
      </div>

      {showBuilder && (
        <Card className="rounded-xl shadow-sm mb-6 border-primary/20">
          <CardHeader>
            <CardTitle className="text-base">Report builder</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Report type</Label>
                <Select defaultValue="monthly">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly impact</SelectItem>
                    <SelectItem value="donor">Donor-specific</SelectItem>
                    <SelectItem value="safehouse">Safehouse</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Start date</Label>
                <Input type="date" defaultValue="2026-03-01" />
              </div>
              <div className="space-y-2">
                <Label>End date</Label>
                <Input type="date" defaultValue="2026-03-31" />
              </div>
            </div>

            <div className="p-4 rounded-lg bg-primary-light text-sm space-y-1">
              <p className="font-semibold text-primary">Auto-generated summary</p>
              <p>• 43 girls actively supported across 4 safehouses</p>
              <p>• 3 program completions, 2 new intakes</p>
              <p>• $12,400 in donations received</p>
              <p>• 92% retention rate</p>
            </div>

            <div className="space-y-2">
              <Label>Narrative (editable)</Label>
              <Textarea placeholder="Add context, stories, and personal touches..." rows={4} />
            </div>

            <div className="flex gap-3">
              <Button variant="hero" size="sm"><Eye className="w-4 h-4 mr-1" /> Preview</Button>
              <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" /> Export PDF</Button>
              <Button variant="teal" size="sm"><Send className="w-4 h-4 mr-1" /> Send to donors</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {pastReports.map((r) => (
          <Card key={r.id} className="rounded-xl shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">{r.title}</p>
                  <p className="text-sm text-muted-foreground">{r.type} · {r.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className={r.status === "Sent" ? "bg-success/10 text-success border-success/20" : ""}>
                  {r.status}
                </Badge>
                <Button variant="ghost" size="sm"><Download className="w-4 h-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default Reports;
