import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card"; // still used in features section
import PublicNav from "@/components/PublicNav";
import StatPill from "@/components/StatPill";
import SafehouseMap from "@/components/SafehouseMap";
import heroImage from "@/assets/hero-image.jpg";
import { UserCheck, Heart, ArrowRight, BookOpen, Home, TrendingUp, ShieldCheck, Smile } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/api/client";


interface PublicStats {
  safehouseCount: number;
  girlsSupported: number;
  activeGirls: number;
  reintegratedGirls: number;
  totalRaised: number;
  retentionRate: number; // 0..1
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
  });

  const stats = statsQuery.data;
  const safehouses = safehousesQuery.data ?? [];
  const care = careStoryQuery.data;

  return (
  <div className="min-h-screen bg-background">
    <PublicNav />

    <main>
    {/* Hero */}
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <img src={heroImage} alt="Girls supported by Ember" className="w-full h-full object-cover" width={1920} height={1080} />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 via-foreground/60 to-foreground/30" />
      </div>
      <div className="relative container py-24 md:py-36 lg:py-44">
        <div className="max-w-2xl space-y-6">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-card leading-tight">
            Every girl deserves a <span className="text-primary">safe place</span> to heal & grow
          </h1>
          <p className="text-lg text-card/80 max-w-xl">
            Ember empowers NGOs in the Philippines to manage donors, safehouses, and the girls in their care — all in one warm, secure platform.
          </p>
          <div className="flex flex-wrap gap-3">
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
          <div className="flex flex-wrap gap-3 pt-4">
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

    {/* Journey of Care */}
    <section className="container py-20 md:py-28">
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
                {care ? care.totalCounselingSessions.toLocaleString() : "…"}
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
                {care ? care.totalHomeVisits.toLocaleString() : "…"}
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
                {care ? `${Math.round(care.progressRate * 100)}%` : "…"}
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
                {care ? `${Math.round(care.positiveEndRate * 100)}%` : "…"}
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
                {care ? care.girlsRiskImproved : "…"}
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
                {care ? `${Math.round(care.favorableVisitRate * 100)}%` : "…"}
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
              <Heart className="w-5 h-5 text-primary" aria-hidden="true" /> Ember
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
          © 2026 Ember. All rights reserved. Privacy Policy.
        </div>
      </div>
    </footer>
  </div>
  );
};

export default Index;
