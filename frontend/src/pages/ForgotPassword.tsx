import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Flame, ArrowLeft, Mail, CheckCircle } from "lucide-react";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      const baseUrl =
        import.meta.env.VITE_API_URL ??
        "https://ember-api-frbhh6fka2anfnac.francecentral-01.azurewebsites.net";
      const res = await fetch(`${baseUrl}/api/password-reset/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { message?: string }).message ?? "Request failed.");
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left: brand panel — matches login page */}
      <div className="hidden lg:flex gradient-ember flex-col justify-center items-center p-12 text-primary-foreground">
        <div className="max-w-md space-y-8 text-center">
          <Flame className="w-16 h-16 mx-auto opacity-90" />
          <h1 className="text-4xl font-extrabold leading-tight">
            Reset your password
          </h1>
          <p className="text-lg opacity-80 leading-relaxed">
            Our admin team will receive your request and provide a temporary
            password so you can get back in quickly.
          </p>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden flex items-center gap-2 text-primary font-bold text-2xl mb-4">
            <Flame className="w-8 h-8" /> Ember
          </div>

          <div>
            <Link
              to="/login"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" /> Back to sign in
            </Link>

            {submitted ? (
              <div className="space-y-4 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">Request sent</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  If that email is registered, an admin will be notified. They'll
                  generate a temporary password and you can sign in with it — you'll
                  be prompted to set a new one immediately.
                </p>
                <Link to="/login">
                  <Button variant="hero" className="w-full mt-4">
                    Back to sign in
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold">Forgot your password?</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Enter your email and an admin will reset it for you.
                </p>

                {error && (
                  <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-sm px-3 py-2">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5 mt-6">
                  <div className="space-y-2">
                    <Label htmlFor="fp-email">Email address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="fp-email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@ember-ngo.org"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-9"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    variant="hero"
                    type="submit"
                    size="lg"
                    className="w-full text-base"
                    disabled={loading}
                  >
                    {loading ? "Sending request…" : "Send reset request"}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
