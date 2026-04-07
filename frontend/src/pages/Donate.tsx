import { useState } from "react";
import PublicNav from "@/components/PublicNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, Check } from "lucide-react";

const presets = [10, 25, 50, 100];

const Donate = () => {
  const [amount, setAmount] = useState(25);
  const [custom, setCustom] = useState("");
  const [monthly, setMonthly] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  const activeAmount = custom ? Number(custom) : amount;
  const girlDays = Math.floor(activeAmount / 0.83);

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <PublicNav />
        <div className="container max-w-lg py-24 text-center space-y-6 animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <Check className="w-10 h-10 text-success" />
          </div>
          <h1 className="text-3xl font-bold">Thank you for your gift!</h1>
          <p className="text-muted-foreground">
            Your {monthly ? "monthly" : "one-time"} donation of ${activeAmount} will make a real difference in the lives of vulnerable girls.
          </p>
          <Button variant="hero" onClick={() => setSubmitted(false)}>Make another gift</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <div className="container max-w-2xl py-16 md:py-24">
        <div className="text-center mb-10">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-2">Make a difference</p>
          <h1 className="text-3xl md:text-4xl font-bold">Support a girl's journey</h1>
        </div>

        <Card className="rounded-xl border-0 shadow-lg">
          <CardContent className="p-8 space-y-8">
            {/* Amount selector */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Choose an amount</Label>
              <div className="grid grid-cols-4 gap-3">
                {presets.map((p) => (
                  <button
                    key={p}
                    onClick={() => { setAmount(p); setCustom(""); }}
                    className={`rounded-lg py-3 text-sm font-semibold border-2 transition-all ${
                      !custom && amount === p
                        ? "border-primary bg-primary-light text-primary"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    ${p}
                  </button>
                ))}
              </div>
              <Input
                placeholder="Custom amount"
                type="number"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                className="mt-2"
              />
            </div>

            {/* Frequency */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Frequency</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setMonthly(true)}
                  className={`rounded-lg py-3 text-sm font-semibold border-2 transition-all ${
                    monthly ? "border-primary bg-primary-light text-primary" : "border-border"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setMonthly(false)}
                  className={`rounded-lg py-3 text-sm font-semibold border-2 transition-all ${
                    !monthly ? "border-primary bg-primary-light text-primary" : "border-border"
                  }`}
                >
                  One-time
                </button>
              </div>
            </div>

            {/* Impact preview */}
            <div className="bg-primary-light rounded-xl p-5 flex items-start gap-4">
              <Heart className="w-8 h-8 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-primary">Your impact</p>
                <p className="text-sm text-foreground/80 mt-1">
                  Your ${activeAmount}{monthly ? "/month" : ""} gift supports a girl for <strong>{girlDays} days</strong> — providing shelter, meals, education, and counseling.
                </p>
              </div>
            </div>

            {/* Donor info */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Your information</Label>
              <div className="grid sm:grid-cols-2 gap-4">
                <Input placeholder="Full name" />
                <Input placeholder="Email address" type="email" />
              </div>
            </div>

            <Button variant="hero" size="lg" className="w-full text-base" onClick={() => setSubmitted(true)}>
              Donate ${activeAmount}{monthly ? "/month" : ""} <Heart className="w-4 h-4 ml-1" />
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Payments processed securely. You can cancel monthly gifts at any time.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Donate;
