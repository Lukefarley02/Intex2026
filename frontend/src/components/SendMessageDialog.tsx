import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Heart,
  HandHeart,
  Send,
  CheckCircle2,
  Users,
  Loader2,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/api/client";
import { toast } from "@/hooks/use-toast";

// ---- Types ----

interface DonorTarget {
  supporterId: number;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  totalDonated: number;
  lastGiftDate: string | null;
}

type TemplateType = "ThankYou" | "Appeal";

interface SendMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Single donor — used when clicking Send on one row. */
  donor?: DonorTarget | null;
  /** Multiple donors — used for bulk send. When set, `donor` is ignored. */
  donors?: DonorTarget[];
}

// ---- Template generators ----

const formatCurrency = (n: number) =>
  `$${Math.round(n).toLocaleString("en-US")}`;

function generateThankYou(donor: DonorTarget): {
  subject: string;
  body: string;
} {
  const name = donor.firstName || donor.displayName || "Friend";
  const lastGift = donor.lastGiftDate
    ? new Date(donor.lastGiftDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;
  return {
    subject: `Thank you, ${name}!`,
    body: `Dear ${name},\n\nThank you so much for your contribution${lastGift ? ` on ${lastGift}` : ""}. Your total giving of ${formatCurrency(donor.totalDonated)} is making a real difference for the girls we serve.\n\nYour support helps us provide shelter, meals, counseling, and education for survivors of trafficking and abuse. It also helps them build a path toward healing and reintegration.\n\nWe're grateful to have you on this journey with us.\n\nWarmly,\nThe Ember Foundation Team`,
  };
}

function generateAppeal(donor: DonorTarget): {
  subject: string;
  body: string;
} {
  const name = donor.firstName || donor.displayName || "Friend";
  return {
    subject: `${name}, can you help one more girl?`,
    body: `Dear ${name},\n\nThank you for everything you've given so far${donor.totalDonated > 0 ? ` (${formatCurrency(donor.totalDonated)} total)` : ""}. We're reaching out because there are still girls waiting for a safe place to call home.\n\nJust $25 a month covers shelter, meals, counseling, and schooling for one girl. That's less than a dollar a day.\n\nWould you consider making another gift? Even a small amount extends the care we can offer and gives a girl a real chance at a fresh start.\n\nYou can give anytime through your donor portal.\n\nThank you,\nThe Ember Foundation Team`,
  };
}

function generateBulkTemplate(
  template: TemplateType,
): { subject: string; body: string } {
  if (template === "ThankYou") {
    return {
      subject: "Thank you for your support!",
      body: "Dear supporter,\n\nWe just wanted to say thank you. Your generosity is making a real difference for the girls we serve.\n\nBecause of donors like you, we can keep providing shelter, meals, counseling, and education for survivors of trafficking and abuse. You're helping them find a path toward healing and a fresh start.\n\nWe're grateful to have you on this journey with us.\n\nWarmly,\nThe Ember Foundation Team",
    };
  }
  return {
    subject: "Can you help one more girl?",
    body: "Dear supporter,\n\nThank you for everything you've given so far. We're reaching out because there are still girls waiting for a safe place to call home.\n\nJust $25 a month covers shelter, meals, counseling, and schooling for one girl. That's less than a dollar a day.\n\nWould you consider making another gift? Even a small amount extends the care we can offer and gives a girl a real chance at a fresh start.\n\nYou can give anytime through your donor portal.\n\nThank you,\nThe Ember Foundation Team",
  };
}

// ---- Component ----

const SendMessageDialog = ({
  open,
  onOpenChange,
  donor,
  donors,
}: SendMessageDialogProps) => {
  const qc = useQueryClient();
  const isBulk = donors && donors.length > 0;
  const recipientCount = isBulk ? donors.length : donor ? 1 : 0;

  const [template, setTemplate] = useState<TemplateType>("ThankYou");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sent, setSent] = useState(false);

  // Regenerate content when template or donor changes
  useEffect(() => {
    if (!open) return;
    setSent(false);
    if (isBulk) {
      const t = generateBulkTemplate(template);
      setSubject(t.subject);
      setBody(t.body);
    } else if (donor) {
      const gen =
        template === "ThankYou"
          ? generateThankYou(donor)
          : generateAppeal(donor);
      setSubject(gen.subject);
      setBody(gen.body);
    }
  }, [template, donor, donors, open, isBulk]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setTemplate("ThankYou");
      setSent(false);
    }
  }, [open]);

  const sendSingleMut = useMutation({
    mutationFn: (payload: {
      supporterId: number;
      templateType: string;
      subject: string;
      body: string;
    }) =>
      apiFetch<{ messageId: number }>("/api/donor-messages", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setSent(true);
      qc.invalidateQueries({ queryKey: ["donor-messages"] });
      toast({ title: "Message sent!" });
    },
    onError: (e: Error) =>
      toast({
        title: "Send failed",
        description: e.message,
        variant: "destructive",
      }),
  });

  const sendBulkMut = useMutation({
    mutationFn: (payload: {
      supporterIds: number[];
      templateType: string;
      subject: string;
      body: string;
    }) =>
      apiFetch<{ sent: number; skipped: number }>("/api/donor-messages/bulk", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      setSent(true);
      qc.invalidateQueries({ queryKey: ["donor-messages"] });
      toast({
        title: `Message sent to ${data.sent} donor${data.sent === 1 ? "" : "s"}`,
      });
    },
    onError: (e: Error) =>
      toast({
        title: "Bulk send failed",
        description: e.message,
        variant: "destructive",
      }),
  });

  const sending = sendSingleMut.isPending || sendBulkMut.isPending;

  const handleSend = () => {
    if (!subject.trim() || !body.trim()) {
      toast({
        title: "Subject and message body are required",
        variant: "destructive",
      });
      return;
    }
    if (isBulk) {
      sendBulkMut.mutate({
        supporterIds: donors.map((d) => d.supporterId),
        templateType: template,
        subject,
        body,
      });
    } else if (donor) {
      sendSingleMut.mutate({
        supporterId: donor.supporterId,
        templateType: template,
        subject,
        body,
      });
    }
  };

  const recipientLabel = isBulk
    ? `${donors.length} donor${donors.length === 1 ? "" : "s"}`
    : donor?.displayName || "Donor";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            {sent ? "Message Sent" : "Send Message"}
          </DialogTitle>
          <DialogDescription>
            {sent ? (
              <span className="flex items-center gap-1.5 text-success">
                <CheckCircle2 className="w-4 h-4" />
                Delivered to {recipientLabel}
              </span>
            ) : (
              <>
                To:{" "}
                <strong>
                  {isBulk && (
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {recipientLabel}
                    </span>
                  )}
                  {!isBulk && recipientLabel}
                </strong>
                {". "}Choose a template, customize if needed, then send.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="py-6 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <p className="text-sm text-muted-foreground">
              The message will appear in{" "}
              {isBulk ? "each donor's" : "the donor's"} notification inbox
              next time they visit their portal.
            </p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Template picker */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">
                Template
              </Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`flex-1 rounded-lg border p-3 text-left transition-colors ${
                    template === "ThankYou"
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => setTemplate("ThankYou")}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Heart className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-sm">Thank You</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Express gratitude for their giving
                  </p>
                </button>
                <button
                  type="button"
                  className={`flex-1 rounded-lg border p-3 text-left transition-colors ${
                    template === "Appeal"
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => setTemplate("Appeal")}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <HandHeart className="w-4 h-4 text-gold" />
                    <span className="font-semibold text-sm">
                      Donation Appeal
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Encourage another contribution
                  </p>
                </button>
              </div>
            </div>

            {/* Subject */}
            <div>
              <Label htmlFor="msg-subject">Subject</Label>
              <Input
                id="msg-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Message subject…"
              />
            </div>

            {/* Body */}
            <div>
              <Label htmlFor="msg-body">Message</Label>
              <Textarea
                id="msg-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                className="resize-y font-mono text-sm"
                placeholder="Write your message…"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                You can edit the template text above before sending.
              </p>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={sending}
              >
                Cancel
              </Button>
              <Button onClick={handleSend} disabled={sending}>
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-1.5" />
                    {isBulk
                      ? `Send to ${recipientCount} donor${recipientCount === 1 ? "" : "s"}`
                      : "Send message"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SendMessageDialog;
