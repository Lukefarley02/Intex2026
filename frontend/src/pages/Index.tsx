import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card"; // still used in features section
import PublicNav from "@/components/PublicNav";
import StatPill from "@/components/StatPill";
import SafehouseMap from "@/components/SafehouseMap";
import FlipCard from "@/components/FlipCard";
import AnimatedCounter from "@/components/AnimatedCounter";
import { useCounterAnimation } from "@/hooks/useCounterAnimation";
import heroImage from "@/assets/hero-image.jpg";
import { UserCheck, Heart, ArrowRight, BookOpen, Home, TrendingUp, ShieldCheck, Smile, X, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/api/client";
import { useAuth } from "@/api/AuthContext";


interface PublicStats {
  safehouseCount: number;
  girlsSupported: number;
  activeGirls: number;
  reintegratedGirls: number;
  totalRaised: number;
  retentionRate: number; // 0..1
  girlsHelped: number;   // totalRaised ÷ live cost-per-girl
  costPerGirl: number;
}

interface CareStory {
  totalCounselingSessions: number;
  totalHomeVisits: number;
  progressRate: number;       // 0..1
  positiveEndRate: number;    // 0..1
  favorableVisitRate: number; // 0..1
  girlsRiskImproved: number;
}

interface PublicSafehouse {
  safehouseId: number;
  name: string;
  city: string | null;
  region: string | null;
  capacity: number;
  activeResidents: number;
}

const Index = () => {
  // First-visit donate banner — shown once per browser session to
  // unauthenticated visitors. Dismissal is remembered in sessionStorage.
  const { isAuthenticated } = useAuth();
  const [showFirstVisitBanner, setShowFirstVisitBanner] = useState(false);
  useEffect(() => {
    if (isAuthenticated) return;
    const dismissed = sessionStorage.getItem("donate-banner-dismissed");
    if (!dismissed) setShowFirstVisitBanner(true);
  }, [isAuthenticated]);
  const dismissBanner = () => {
    sessionStorage.setItem("donate-banner-dismissed", "1");
    setShowFirstVisitBanner(false);
  };

  const statsQuery = useQuery<PublicStats>({
    queryKey: ["public-stats"],
    queryFn: () => apiFetch<PublicStats>("/api/public/stats"),
  });

  const safehousesQuery = useQuery<PublicSafehouse[]>({
    queryKey: ["public-safehouses"],
    queryFn: () => apiFetch<PublicSafehouse[]>("/api/public/safehouses"),
  });

  const careStoryQuery = useQuery<CareStory>({
    queryKey: ["public-care-story"],
    queryFn: () => apiFetch<CareStory>("/api/public/care-story"),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  const stats = statsQuery.data;
  const safehouses = safehousesQuery.data ?? [];
  const care = careStoryQuery.data;

  return (
  <div className="min-h-screen bg-background">
    {/* First-visit donate banner (unauthenticated, dismissible) */}
    {showFirstVisitBanner && (
      <div className="gradient-ember text-primary-foreground">
        <div className="container flex items-center justify-between gap-4 py-2.5 text-sm">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">
              First time here? A $25 gift can shelter a girl for 30 days.
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link to="/donate">
              <Button
                size="sm"
                variant="secondary"
                className="bg-card text-primary hover:bg-card/90 h-7 text-xs font-semibold"
              >
                Donate now <Heart className="w-3 h-3 ml-1" aria-hidden="true" />
              </Button>
            </Link>
            <button
              type="button"
              onClick={dismissBanner}
              aria-label="Dismiss donate banner"
              className="p-1 rounded hover:bg-card/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    )}

    <PublicNav />

    <main>
    {/* Hero */}
    <section id="mission" className="relative overflow-hidden">
      <div className="absolute inset-0">
        <img src={heroImage} alt="Girls supported by Ember Foundation" className="w-full h-full object-cover" width={1920} height={1080} />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 via-foreground/60 to-foreground/30" />
      </div>
      <div className="relative container py-24 md:py-36 lg:py-44">
        <div className="max-w-2xl space-y-6">
          <h1 className="animate-fade-in-up-1 text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-card leading-tight">
            Every girl deserves a <span className="text-primary">safe place</span> to heal & grow
          </h1>
          <p className="animate-fade-in-up-2 text-lg text-card/80 max-w-xl">
            Ember Foundation empowers NGOs in the Philippines to manage donors, safehouses, and the girls in their care — all in one warm, secure platform.
          </p>
          <div className="animate-fade-in-up-3 flex flex-wrap gap-3">
            <Link to="/donate">
              <Button variant="hero" size="lg" className="text-base">
                Support a girl's journey <Heart className="w-4 h-4 ml-1" aria-hidden="true" />
              </Button>
            </Link>
            <a href="#impact">
              <Button variant="hero-outline" size="lg" className="text-base border-card/40 text-card hover:bg-card/10">
                See our locations
              </Button>
            </a>
          </div>
          <div className="animate-fade-in-up-4 flex flex-wrap gap-3 pt-4">
            <StatPill
              value={stats ? String(stats.girlsSupported) : "…"}
              label="girls supported"
            />
            <StatPill
              value={stats ? String(stats.safehouseCount) : "…"}
              label="safehouses"
            />
            <StatPill
              value={
                stats ? `${Math.round(stats.retentionRate * 100)}%` : "…"
              }
              label="retention rate"
            />
          </div>
        </div>
      </div>
    </section>

    {/* Mission */}
    <section id="mission-section" className="bg-card py-20 md:py-28">
      <div className="container">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest">Our mission</p>
          <h2 className="text-3xl md:text-4xl font-bold leading-tight">
            Restoring hope, one girl at a time
          </h2>
          <p className="text-muted-foreground leading-relaxed text-base md:text-lg">
            Ember Foundation exists to support NGOs in the Philippines who shelter, rehabilitate, and reintegrate
            girls who have experienced trafficking, abuse, and exploitation. We believe every girl
            deserves safety, dignity, and a future full of possibility.
          </p>
          <div className="grid sm:grid-cols-3 gap-8 pt-6 text-left">
            <FlipCard
              icon={<Heart className="w-5 h-5 text-primary" />}
              title="Protect"
              description="Provide safe shelter and immediate care for girls rescued from dangerous situations."
              backContent={
                <div className="space-y-2 h-full flex flex-col justify-center">
                  <h4 className="font-semibold text-lg">Our Protection</h4>
                  <p className="text-sm opacity-90 flex-grow">
                    We create sanctuaries where girls find immediate safety, medical care, and a team dedicated to their wellbeing.
                  </p>
                  <div className="pt-2 text-xs opacity-75">
                    Safe spaces for healing
                  </div>
                </div>
              }
            />
            <FlipCard
              icon={<BookOpen className="w-5 h-5 text-primary" />}
              title="Rehabilitate"
              description="Walk alongside each girl through counseling, education, and personalized care plans."
              backContent={
                <div className="space-y-2 h-full flex flex-col justify-center">
                  <h4 className="font-semibold text-lg">Healing Process</h4>
                  <p className="text-sm opacity-90 flex-grow">
                    Through counseling, education, skills training, and community support, we help each girl reclaim hope and possibility.
                  </p>
                  <div className="pt-2 text-xs opacity-75">
                    Personalized care & growth
                  </div>
                </div>
              }
            />
            <FlipCard
              icon={<UserCheck className="w-5 h-5 text-primary" />}
              title="Reintegrate"
              description="Equip girls with skills and family support to return confidently to their communities."
              backContent={
                <div className="space-y-2 h-full flex flex-col justify-center">
                  <h4 className="font-semibold text-lg">Reintegration</h4>
                  <p className="text-sm opacity-90 flex-grow">
                    We empower girls with economic skills, reconcile families, and ensure safe transitions back to their communities.
                  </p>
                  <div className="pt-2 text-xs opacity-75">
                    Independent, confident futures
                  </div>
                </div>
              }
            />
          </div>
        </div>
      </div>
    </section>

    {/* Journey of Care */}
    <section id="how-we-care" className="container py-20 md:py-28">
      <div className="text-center mb-14">
        <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-2">How we care</p>
        <h2 className="text-3xl md:text-4xl font-bold">Every girl receives consistent, personalized care</h2>
        <p className="text-muted-foreground mt-4 max-w-xl mx-auto text-sm leading-relaxed">
          From daily counseling sessions to family home visits, our team is present at every step of each girl's healing journey.
        </p>
      </div>

      {/* Top row: volume of care */}
      <div className="grid md:grid-cols-3 gap-6 mb-6">
        <Card className="border-0 shadow-md rounded-xl">
          <CardContent className="p-8 flex items-start gap-5">
            <div className="w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center shrink-0">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-3xl font-extrabold text-foreground">
                {careStoryQuery.isLoading ? "…" : <AnimatedCounter value={care?.totalCounselingSessions} />}
              </p>
              <p className="text-sm font-medium text-muted-foreground mt-1">Counseling sessions held</p>
              <p className="text-xs text-muted-foreground mt-1">One-on-one and group sessions with social workers</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md rounded-xl">
          <CardContent className="p-8 flex items-start gap-5">
            <div className="w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center shrink-0">
              <Home className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-3xl font-extrabold text-foreground">
                {careStoryQuery.isLoading ? "…" : <AnimatedCounter value={care?.totalHomeVisits} />}
              </p>
              <p className="text-sm font-medium text-muted-foreground mt-1">Home & family visits made</p>
              <p className="text-xs text-muted-foreground mt-1">Checking on girls in their communities and homes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md rounded-xl">
          <CardContent className="p-8 flex items-start gap-5">
            <div className="w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-3xl font-extrabold text-foreground">
                {careStoryQuery.isLoading ? "…" : care ? `${Math.round(care.progressRate * 100)}%` : "…"}
              </p>
              <p className="text-sm font-medium text-muted-foreground mt-1">Of sessions show measurable progress</p>
              <p className="text-xs text-muted-foreground mt-1">Noted by social workers after each session</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: transformation metrics */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-md rounded-xl bg-primary-light/30">
          <CardContent className="p-8 flex items-start gap-5">
            <div className="w-12 h-12 rounded-xl bg-card flex items-center justify-center shrink-0">
              <Smile className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-3xl font-extrabold text-foreground">
                {careStoryQuery.isLoading ? "…" : care ? `${Math.round(care.positiveEndRate * 100)}%` : "…"}
              </p>
              <p className="text-sm font-medium text-muted-foreground mt-1">Sessions end on a hopeful note</p>
              <p className="text-xs text-muted-foreground mt-1">Girls leaving sessions feeling calm, hopeful, or motivated</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md rounded-xl bg-primary-light/30">
          <CardContent className="p-8 flex items-start gap-5">
            <div className="w-12 h-12 rounded-xl bg-card flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-3xl font-extrabold text-foreground">
                {careStoryQuery.isLoading ? "…" : <AnimatedCounter value={care?.girlsRiskImproved} />}
              </p>
              <p className="text-sm font-medium text-muted-foreground mt-1">Girls moved from high to low risk</p>
              <p className="text-xs text-muted-foreground mt-1">Reduced from critical or high risk to medium or low</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md rounded-xl bg-primary-light/30">
          <CardContent className="p-8 flex items-start gap-5">
            <div className="w-12 h-12 rounded-xl bg-card flex items-center justify-center shrink-0">
              <UserCheck className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-3xl font-extrabold text-foreground">
                {careStoryQuery.isLoading ? "…" : care ? `${Math.round(care.favorableVisitRate * 100)}%` : "…"}
              </p>
              <p className="text-sm font-medium text-muted-foreground mt-1">Home visits end favorably</p>
              <p className="text-xs text-muted-foreground mt-1">Family environments assessed as safe and supportive</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>

    {/* Impact / Safehouses */}
    <section id="impact" className="bg-card py-20 md:py-28">
      <div className="container">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold text-secondary uppercase tracking-widest mb-2">Our reach</p>
          <h2 className="text-3xl md:text-4xl font-bold">Active safehouses across the Philippines</h2>
        </div>
        {safehousesQuery.isError && (
          <p className="text-center text-sm text-muted-foreground">
            Safehouse information is temporarily unavailable.
          </p>
        )}
        <SafehouseMap safehouses={safehouses} />
      </div>
    </section>

    </main>

    {/* Donation CTA */}
    <section className="gradient-ember py-16 md:py-20">
      <div className="container text-center space-y-6">
        <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground">
          Your generosity changes lives
        </h2>
        <p className="text-primary-foreground/80 max-w-xl mx-auto">
          A monthly gift of $25 can support one girl for 30 days — providing shelter, education, and a path to healing.
        </p>
        <Link to="/donate">
          <Button size="lg" className="bg-card text-primary hover:bg-card/90 text-base mt-2">
            Start giving monthly <ArrowRight className="w-4 h-4 ml-1" aria-hidden="true" />
          </Button>
        </Link>
      </div>
    </section>

    {/* Footer */}
    <footer className="bg-foreground text-card/70 py-12">
      <div className="container">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 text-card font-bold text-lg mb-3">
              <Heart className="w-5 h-5 text-primary" aria-hidden="true" /> Ember Foundation
            </div>
            <p className="text-sm leading-relaxed">
              Empowering NGOs in the Philippines to protect, nurture, and restore the lives of vulnerable girls.
            </p>
          </div>
          <div>
            <h4 className="text-card font-semibold mb-3">Quick links</h4>
            <div className="space-y-2 text-sm">
              <a href="#mission" className="block hover:text-card transition-colors">Our mission</a>
              <a href="#impact" className="block hover:text-card transition-colors">Impact</a>
              <Link to="/donate" className="block hover:text-card transition-colors">Donate</Link>
              <Link to="/login" className="block hover:text-card transition-colors">Log in</Link>
            </div>
          </div>
          <div>
            <h4 className="text-card font-semibold mb-3">Contact</h4>
            <p className="text-sm">hello@ember-ngo.org</p>
            <p className="text-sm mt-1">Manila, Philippines</p>
          </div>
        </div>
        <div className="border-t border-card/10 mt-8 pt-6 text-xs text-center">
          © 2026 Ember Foundation. All rights reserved. <Link to="/privacy" className="underline hover:text-card">Privacy Policy</Link>.
        </div>
      </div>
    </footer>
  </div>
  );
};

export default Index;
