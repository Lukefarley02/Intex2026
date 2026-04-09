import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import DonateHeader from "@/components/DonateHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Heart, Check, Sparkles, FileText, Gift, UserCheck, MapPin } from "lucide-react";
import { apiFetch } from "@/api/client";
import { useAuth } from "@/api/AuthContext";

const presets = [10, 25, 50, 100];

// Launches a full-screen ember/fire particle burst via Canvas.
// Particles spawn from the bottom-centre and arc upward like embers rising
// from a fire — warm orange/red/gold palette to match the Ember brand.
// The canvas is appended to body, animates for ~2.5 s, then removes itself.
const launchEmberBurst = () => {
  try {
    const canvas = document.createElement("canvas");
    canvas.style.cssText =
      "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999;";
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    if (!ctx) { canvas.remove(); return; }

    // Ember colour palette — fire oranges, reds, and gold highlights
    const COLORS = [
      "#FF6B1A", "#FF8C42", "#FF4500", "#FFA500", "#FFD700",
      "#FF3300", "#FF6600", "#FFAA00", "#FF2200", "#FFCC44",
    ];

    interface Particle {
      x: number; y: number;
      vx: number; vy: number;
      radius: number;
      color: string;
      alpha: number;
      decay: number;   // alpha fade per frame
      gravity: number; // downward pull
      spin: number;    // slight rotation wobble
      age: number;
    }

    const particles: Particle[] = [];
    const W = canvas.width;
    const H = canvas.height;

    // Spawn 220 particles from two anchor points:
    //   • centre-bottom (main fire column)
    //   • 20% inset on each side (side sparks)
    const origins = [
      { x: W * 0.5, y: H },
      { x: W * 0.25, y: H },
      { x: W * 0.75, y: H },
    ];

    for (let i = 0; i < 220; i++) {
      const o = origins[i % origins.length];
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.85;
      const speed = 4 + Math.random() * 11;
      particles.push({
        x: o.x + (Math.random() - 0.5) * 60,
        y: o.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2.5 + Math.random() * 5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        alpha: 0.9 + Math.random() * 0.1,
        decay: 0.012 + Math.random() * 0.018,
        gravity: 0.18 + Math.random() * 0.12,
        spin: (Math.random() - 0.5) * 0.3,
        age: 0,
      });
    }

    let raf: number;
    const animate = () => {
      ctx.clearRect(0, 0, W, H);
      let alive = 0;
      for (const p of particles) {
        if (p.alpha <= 0) continue;
        alive++;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;       // gravity pulls embers down
        p.vx += p.spin;          // gentle sideways drift
        p.vx *= 0.985;           // air resistance
        p.alpha -= p.decay;
        p.age++;

        // Draw a glowing ember: outer soft glow + bright core
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 2.5);
        grd.addColorStop(0, p.color + "FF");
        grd.addColorStop(0.4, p.color + "CC");
        grd.addColorStop(1, p.color + "00");

        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        // Bright white-hot centre for the hottest embers
        if (p.age < 18) {
          ctx.globalAlpha = Math.max(0, p.alpha * 0.7);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 0.45, 0, Math.PI * 2);
          ctx.fillStyle = "#FFFFFF";
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      if (alive > 0) {
        raf = requestAnimationFrame(animate);
      } else {
        canvas.remove();
      }
    };
    raf = requestAnimationFrame(animate);

    // Hard cap: remove canvas after 3 s even if a stray particle lingers
    setTimeout(() => {
      cancelAnimationFrame(raf);
      canvas.remove();
    }, 3000);
  } catch {
    // Visual effect — never block the donation flow on it.
  }
};

// Plays a short two-note "ding" chime using the Web Audio API so we don't
// have to ship an audio asset. Safari/iOS require the AudioContext to be
// created inside a user-gesture handler, which is why we instantiate it
// on demand inside handleDonate rather than at module load.
const playDonationDing = () => {
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const now = ctx.currentTime;

    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      // Quick attack, gentle release so it sounds like a bell, not a beep.
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(0.35, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + duration + 0.05);
    };

    // C6 → E6 rising two-note chime (cheerful confirmation).
    playTone(1046.5, 0, 0.25);
    playTone(1318.5, 0.18, 0.45);

    // Release the context after the chime finishes so we don't leak it.
    setTimeout(() => {
      void ctx.close();
    }, 900);
  } catch {
    // Audio is nice-to-have; never block the donation flow on it.
  }
};

interface DonateResponse {
  donationId: number;
  supporterId: number;
  email: string;
  createdNewSupporter: boolean;
  isAnonymous: boolean;
}

interface DonorProfile {
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  email: string;
}

interface PublicSafehouse {
  safehouseId: number;
  name: string;
  city: string | null;
  region: string | null;
  capacity: number;
  activeResidents: number;
}

const Donate = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, hasRole } = useAuth();

  // Optional campaign pre-selection via ?campaign=... — used by the Donor
  // Portal "Contribute" buttons so each gift is attributed to the campaign
  // the donor clicked on. Falls through to "General Fund" on the backend
  // when absent.
  const [searchParams] = useSearchParams();
  const campaignName = searchParams.get("campaign");

  // If the visitor is signed in as a Donor, fetch their supporter profile
  // so we can prefill first name / last name / email and skip asking them
  // to re-enter it. Only runs when authenticated + Donor role.
  const isSignedInDonor = isAuthenticated && hasRole("Donor");
  const profileQ = useQuery<DonorProfile>({
    queryKey: ["donor-profile-for-donate"],
    queryFn: () => apiFetch<DonorProfile>("/api/donorportal/me"),
    enabled: isSignedInDonor,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // Public safehouse directory — powers the "Donate to a safehouse" picker
  // so first-time visitors can designate their gift at the point of donation
  // without needing an account. Uses the existing [AllowAnonymous] endpoint
  // that exposes only name/city/region/capacity/active count (no PII).
  const safehousesQ = useQuery<PublicSafehouse[]>({
    queryKey: ["public-safehouses-donate"],
    queryFn: () => apiFetch<PublicSafehouse[]>("/api/public/safehouses"),
    staleTime: 5 * 60 * 1000,
  });

  // ── Donation form state ──
  const [amount, setAmount] = useState(25);
  const [custom, setCustom] = useState("");
  const [monthly, setMonthly] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Safehouse designation — when `designateToSafehouse` is true, the donor
  // picks a specific safehouse and its name is sent to the backend as
  // `safehouseName`, which is then stamped into donations.notes as
  // "Designated for: <name>". Pre-seeded from `?location=` if present.
  const [designateToSafehouse, setDesignateToSafehouse] = useState(
    Boolean(searchParams.get("location")),
  );
  const [selectedSafehouse, setSelectedSafehouse] = useState<string>(
    searchParams.get("location") ?? "",
  );

  // ── Post-donation flow state ──
  // "idle" → form; "ask" → prompt modal; "password" → inline register
  // "done-anon" → thanks (no account); "done-linked" → account created.
  type Phase = "idle" | "ask" | "password" | "done-anon" | "done-linked";
  const [phase, setPhase] = useState<Phase>("idle");
  const [lastDonation, setLastDonation] = useState<DonateResponse | null>(null);

  // Inline registration state
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  // Prefill identity fields when the donor profile arrives. We deliberately
  // do NOT overwrite whatever the donor has already typed — only populate
  // blank fields. That way if a donor manually edited something, we don't
  // stomp on their edits when react-query revalidates.
  useEffect(() => {
    if (!profileQ.data) return;
    const p = profileQ.data;
    setFirstName((prev) => prev || p.firstName || "");
    setLastName((prev) => prev || p.lastName || "");
    setEmail((prev) => prev || p.email || "");
  }, [profileQ.data]);

  const activeAmount = custom ? Number(custom) : amount;
  // Program economics: the public anchor rate is "$25 shelters a girl
  // for a full month" — so monthly cost = $25, yearly = $300, daily =
  // $25/30 ≈ $0.833. Every impact figure on this page is derived from
  // that baseline. For monthly gifts we annualize (× 12) so donors see
  // the real 12-month impact of a recurring commitment.
  const MONTHLY_COST_PER_GIRL = 25;
  const DAILY_COST_PER_GIRL = MONTHLY_COST_PER_GIRL / 30;
  const annualizedAmount = (activeAmount || 0) * (monthly ? 12 : 1);
  const girlDays = Math.floor(annualizedAmount / DAILY_COST_PER_GIRL);
  const girlMonths = Math.floor(annualizedAmount / MONTHLY_COST_PER_GIRL);

  // Hardened password policy (matches backend Identity configuration):
  // length ≥ 14, upper, lower, digit, non-alphanumeric.
  const validatePassword = (pw: string): string | null => {
    if (pw.length < 14) return "Password must be at least 14 characters.";
    if (!/[A-Z]/.test(pw)) return "Password must contain an uppercase letter.";
    if (!/[a-z]/.test(pw)) return "Password must contain a lowercase letter.";
    if (!/[0-9]/.test(pw)) return "Password must contain a digit.";
    if (!/[^A-Za-z0-9]/.test(pw)) return "Password must contain a symbol.";
    return null;
  };

  const handleDonate = async () => {
    setFormError(null);

    if (!activeAmount || activeAmount <= 0) {
      setFormError("Please choose a donation amount.");
      return;
    }
    if (activeAmount > 10000) {
      setFormError(
        "Donations over $10,000 require personal assistance from our team. Please contact us at hello@ember-ngo.org to arrange your gift — we'd love to speak with you directly.",
      );
      return;
    }
    if (!anonymous && !email.trim()) {
      setFormError("Email is required unless you choose to donate anonymously.");
      return;
    }
    if (designateToSafehouse && !selectedSafehouse) {
      setFormError("Please choose a safehouse to designate your gift to.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch<DonateResponse>("/api/public/donate", {
        method: "POST",
        body: JSON.stringify({
          firstName: firstName || null,
          lastName: lastName || null,
          email: anonymous ? null : email.trim(),
          amount: activeAmount,
          monthly,
          isAnonymous: anonymous,
          campaignName: campaignName,
          safehouseName: designateToSafehouse ? selectedSafehouse : null,
        }),
      });
      setLastDonation(res);
      playDonationDing();
      launchEmberBurst();

      if (anonymous) {
        // Anonymous donors are not offered account creation — their row is
        // already saved under a synthetic email and we have no way to link.
        setPhase("done-anon");
      } else if (isSignedInDonor) {
        // Already signed in — the donation is already linked to their
        // supporter row (DonorPortal matches by email), so skip the
        // "create an account?" prompt and go straight to the thank-you
        // screen. We reuse "done-linked" so the user sees the donor-portal
        // CTA instead of the anonymous messaging.
        setPhase("done-linked");
      } else {
        setPhase("ask");
      }
    } catch (err) {
      console.error(err);
      setFormError(
        err instanceof Error ? err.message : "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async () => {
    setRegisterError(null);
    const pwError = validatePassword(password);
    if (pwError) {
      setRegisterError(pwError);
      return;
    }
    if (password !== confirmPw) {
      setRegisterError("Passwords do not match.");
      return;
    }

    setRegistering(true);
    try {
      // POST /api/auth/register creates the Identity account with the
      // "Donor" role. DonorPortalController matches the supporter row by
      // email, so the donation we just saved will appear automatically in
      // the donor portal as soon as they land on it.
      const res = await fetch(
        `${import.meta.env.VITE_API_URL ?? "https://ember-api-frbhh6fka2anfnac.francecentral-01.azurewebsites.net"}/api/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), password }),
        },
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const messages = Object.values(body)
          .flat()
          .filter((v): v is string => typeof v === "string");
        throw new Error(messages.join(" ") || "Registration failed.");
      }

      // Auto-login so the donor portal authorizes on the next navigation.
      await login(email.trim(), password);
      setPhase("done-linked");
    } catch (err) {
      setRegisterError(
        err instanceof Error ? err.message : "Registration failed.",
      );
    } finally {
      setRegistering(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  // Thank-you screens
  // ─────────────────────────────────────────────────────────────────────
  if (phase === "done-anon" || phase === "done-linked") {
    const linked = phase === "done-linked";
    return (
      <div className="min-h-screen bg-background">
        <DonateHeader />
        <div className="container max-w-lg py-24 text-center space-y-6 animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <Check className="w-10 h-10 text-success" />
          </div>
          <h1 className="text-3xl font-bold">Thank you for your gift!</h1>
          <p className="text-muted-foreground">
            Your {monthly ? "monthly" : "one-time"} donation of ${activeAmount} will make a real difference in the lives of vulnerable girls.
          </p>
          {linked ? (
            <div className="space-y-3">
              <p className="text-sm text-primary font-medium">
                Your account is ready — your donation is already saved to it.
              </p>
              <Button variant="hero" onClick={() => navigate("/my-impact")}>
                Go to my donor portal
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {lastDonation?.isAnonymous
                ? "This donation was saved anonymously — no personal information is linked to it."
                : "This donation has been saved. You can create an account any time to track your impact."}
            </p>
          )}
          <Button
            variant="hero-outline"
            onClick={() => {
              // Reset and go back to form for another gift
              setPhase("idle");
              setLastDonation(null);
              setCustom("");
              setAmount(25);
              setPassword("");
              setConfirmPw("");
            }}
          >
            Make another gift
          </Button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // Main form
  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <DonateHeader />
      <div className="container max-w-2xl py-16 md:py-24">
        <div className="text-center mb-10">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-2">Make a difference</p>
          <h1 className="text-3xl md:text-4xl font-bold">Support a girl's journey</h1>
          {campaignName && (
            <p className="mt-3 text-sm text-muted-foreground">
              Contributing to{" "}
              <span className="font-semibold text-primary">{campaignName}</span>
            </p>
          )}
        </div>

        <Card className="rounded-xl border-0 shadow-lg">
          <CardContent className="p-8 space-y-8">
            {/* Amount selector */}
            <div className="space-y-3">
              <Label className="text-base font-semibold" id="amount-label">Choose an amount</Label>
              <div className="grid grid-cols-4 gap-3" role="group" aria-labelledby="amount-label">
                {presets.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => { setAmount(p); setCustom(""); }}
                    aria-pressed={!custom && amount === p}
                    aria-label={`Donate $${p}`}
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
              <Label htmlFor="custom-amount" className="sr-only">Custom donation amount</Label>
              <Input
                id="custom-amount"
                placeholder="Custom amount"
                type="number"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                className="mt-2"
                aria-label="Custom donation amount"
              />
            </div>

            {/* Frequency */}
            <div className="space-y-3">
              <Label className="text-base font-semibold" id="frequency-label">Frequency</Label>
              <div className="grid grid-cols-2 gap-3" role="group" aria-labelledby="frequency-label">
                <button
                  type="button"
                  onClick={() => setMonthly(true)}
                  aria-pressed={monthly}
                  className={`rounded-lg py-3 text-sm font-semibold border-2 transition-all ${
                    monthly ? "border-primary bg-primary-light text-primary" : "border-border"
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setMonthly(false)}
                  aria-pressed={!monthly}
                  className={`rounded-lg py-3 text-sm font-semibold border-2 transition-all ${
                    !monthly ? "border-primary bg-primary-light text-primary" : "border-border"
                  }`}
                >
                  One-time
                </button>
              </div>
            </div>

            {/* Donate to a specific safehouse
                Donors can optionally earmark their gift for one safehouse.
                The choice is posted to /api/public/donate as `safehouseName`
                and ends up stamped into donations.notes as
                "Designated for: <name>". If unchecked, the gift goes to the
                general fund (or the campaign pre-selected via ?campaign=). */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Donate to a safehouse
              </Label>
              <label className="flex items-center gap-2 text-sm text-muted-foreground select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={designateToSafehouse}
                  onChange={(e) => {
                    setDesignateToSafehouse(e.target.checked);
                    if (!e.target.checked) setSelectedSafehouse("");
                  }}
                  className="h-4 w-4 accent-primary"
                />
                Yes, I'd like to designate this gift to a specific safehouse
              </label>

              {designateToSafehouse && (
                <div className="space-y-2 pl-6">
                  {/* Dropdown picker — mirrors the safehouse selector on
                      the Donor Portal ("My Impact") page so the two flows
                      feel identical. Each option shows "Name — City, Region"
                      just like the donor-portal version. */}
                  <Select
                    value={selectedSafehouse}
                    onValueChange={setSelectedSafehouse}
                    disabled={
                      safehousesQ.isLoading ||
                      (safehousesQ.data?.length ?? 0) === 0
                    }
                  >
                    <SelectTrigger
                      className="h-10 text-sm"
                      aria-label="Select a safehouse to donate to"
                    >
                      <SelectValue
                        placeholder={
                          safehousesQ.isLoading
                            ? "Loading safehouses…"
                            : (safehousesQ.data?.length ?? 0) === 0
                              ? "No safehouses available"
                              : "Choose a safehouse…"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {(safehousesQ.data ?? []).map((s) => {
                        const location = [s.city, s.region]
                          .filter(Boolean)
                          .join(", ");
                        return (
                          <SelectItem key={s.safehouseId} value={s.name}>
                            {s.name}
                            {location ? ` — ${location}` : ""}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Impact preview */}
            <div className="bg-primary-light rounded-xl p-5 flex items-start gap-4">
              <Heart className="w-8 h-8 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-primary">Your impact</p>
                <p className="text-sm text-foreground/80 mt-1">
                  {monthly ? (
                    <>
                      Your ${activeAmount}/month gift funds{" "}
                      <strong>
                        {girlMonths >= 24
                          ? `${Math.floor(girlMonths / 12)} years`
                          : `${girlMonths} ${girlMonths === 1 ? "month" : "months"}`}
                      </strong>{" "}
                      of care across a full year — shelter, meals, schooling,
                      and counseling for a girl in our safehouses.
                    </>
                  ) : (
                    <>
                      Your ${activeAmount} gift provides{" "}
                      <strong>{girlDays} days</strong> of shelter, meals,
                      schooling, and counseling for a girl in a safehouse.
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Donor info
                Signed-in donors don't need to re-enter their info — we
                pull it from their supporter profile via the useQuery above
                and just show a summary card here. They can still opt to
                donate anonymously, which strips their identity from the
                donation row entirely (saved under a synthetic supporter). */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Your information</Label>

              {isSignedInDonor ? (
                <div className="rounded-lg border bg-muted/30 p-4 space-y-1">
                  {profileQ.isLoading && !profileQ.data ? (
                    <p className="text-sm text-muted-foreground">
                      Loading your profile…
                    </p>
                  ) : (
                    <>
                      <p className="text-sm font-medium">
                        {[firstName, lastName].filter(Boolean).join(" ") ||
                          profileQ.data?.displayName ||
                          "Donor"}
                      </p>
                      <p className="text-xs text-muted-foreground">{email}</p>
                      <p className="text-xs text-muted-foreground pt-1">
                        {anonymous
                          ? "This donation will be saved anonymously and will not appear in your donor portal."
                          : "We'll link this gift to your account automatically."}
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Input
                      placeholder="First name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      disabled={anonymous}
                    />
                    <Input
                      placeholder="Last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      disabled={anonymous}
                    />
                  </div>
                  <Input
                    placeholder="Email address"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={anonymous}
                  />
                </>
              )}

              <label className="flex items-center gap-2 text-sm text-muted-foreground select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={anonymous}
                  onChange={(e) => setAnonymous(e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                I'd like to donate anonymously
              </label>
            </div>

            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}

            <Button
              variant="hero"
              size="lg"
              className="w-full text-base"
              onClick={handleDonate}
              disabled={submitting}
            >
              {submitting ? (
                "Processing…"
              ) : (
                <>
                  Donate ${activeAmount}{monthly ? "/month" : ""} <Heart className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Payments processed securely. You can cancel monthly gifts at any time.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ───────── Post-donation account prompt ───────── */}
      <Dialog open={phase === "ask"} onOpenChange={(o) => !o && setPhase("done-anon")}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="w-5 h-5 text-primary" />
              Create a free donor account?
            </DialogTitle>
            <DialogDescription>
              Your ${activeAmount} donation is already saved. Creating an
              account lets you keep everything in one place.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-light flex items-center justify-center flex-shrink-0">
                <Heart className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Track your impact</p>
                <p className="text-xs text-muted-foreground">
                  See how many girls your giving has helped over time.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-light flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Download tax receipts</p>
                <p className="text-xs text-muted-foreground">
                  Generate an IRS-compliant donation receipt letter for your tax return.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-light flex items-center justify-center flex-shrink-0">
                <Gift className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Full donation history</p>
                <p className="text-xs text-muted-foreground">
                  Every past gift, all in one place — no more searching your inbox.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-light flex items-center justify-center flex-shrink-0">
                <UserCheck className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Manage recurring gifts</p>
                <p className="text-xs text-muted-foreground">
                  Pause, change, or cancel your monthly support any time.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button
              variant="ghost"
              onClick={() => setPhase("done-anon")}
              className="w-full sm:w-auto"
            >
              No thanks
            </Button>
            <Button
              variant="hero"
              onClick={() => setPhase("password")}
              className="w-full sm:w-auto"
            >
              Yes, create account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───────── Inline password prompt ───────── */}
      <Dialog open={phase === "password"} onOpenChange={(o) => !o && setPhase("ask")}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set a password</DialogTitle>
            <DialogDescription>
              We'll use your email ({email}) as your username. Your
              donation will be linked automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="donate-pw">Password</Label>
              <Input
                id="donate-pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 14 characters"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="donate-pw-confirm">Confirm password</Label>
              <Input
                id="donate-pw-confirm"
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Must be 14+ characters and include an uppercase letter, a lowercase letter, a digit, and a symbol.
            </p>
            {registerError && (
              <p className="text-sm text-destructive">{registerError}</p>
            )}
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button
              variant="ghost"
              onClick={() => setPhase("ask")}
              disabled={registering}
              className="w-full sm:w-auto"
            >
              Back
            </Button>
            <Button
              variant="hero"
              onClick={handleRegister}
              disabled={registering}
              className="w-full sm:w-auto"
            >
              {registering ? "Creating account…" : "Create account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Donate;
