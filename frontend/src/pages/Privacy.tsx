import PublicNav from "@/components/PublicNav";
import { Card, CardContent } from "@/components/ui/card";

const Privacy = () => (
  <div className="min-h-screen bg-background">
    <PublicNav />
    <section className="container py-16 md:py-24 max-w-3xl">
      <div className="mb-10">
        <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-2">
          Legal
        </p>
        <h1 className="text-4xl font-extrabold tracking-tight">Privacy Policy</h1>
        <p className="text-muted-foreground mt-3">
          Last updated April 7, 2026
        </p>
      </div>

      <Card className="border-0 shadow-md rounded-xl">
        <CardContent className="p-8 space-y-6 text-sm leading-relaxed text-foreground/90">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold">What we collect</h2>
            <p>
              Ember collects only the information needed to operate the platform
              and protect the girls in our care. This includes account details
              for staff and donors, donation records, and resident case notes
              that are restricted to authorized personnel.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">How we use it</h2>
            <p>
              We use your information to provide the case management and donor
              management features of the platform, generate impact reports, and
              keep your account secure. Sensitive resident and medical notes
              are restricted to admin users and never shared with donors.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">How we protect it</h2>
            <p>
              Ember enforces role-based access control, JWT authentication,
              HTTPS-only delivery, and a strict Content Security Policy. We
              minimize data retention and audit access to sensitive fields.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">Your rights</h2>
            <p>
              You can request a copy of your data, ask us to correct it, or
              ask us to delete it at any time by contacting your administrator
              or emailing privacy@ember-ngo.org.
            </p>
          </section>
        </CardContent>
      </Card>
    </section>
  </div>
);

export default Privacy;
