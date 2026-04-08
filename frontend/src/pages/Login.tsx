import { useState } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Flame, ArrowLeft } from "lucide-react";
import { useAuth, landingFor } from "@/api/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // If the user is already signed in, render a <Navigate> element instead
  // of calling navigate() during render. The old code called navigate() at
  // render time and returned null, which just showed a blank white page.
  if (isAuthenticated) {
    return <Navigate to={landingFor(user?.roles)} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const loggedInUser = await login(email, password);
      navigate(landingFor(loggedInUser.roles), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left: brand panel */}
      <div className="hidden lg:flex gradient-teal flex-col justify-center items-center p-12 text-secondary-foreground">
        <div className="max-w-md space-y-8 text-center">
          <Flame className="w-16 h-16 mx-auto opacity-90" />
          <h1 className="text-4xl font-extrabold leading-tight">
            Welcome back to Ember
          </h1>
          <p className="text-lg opacity-80 leading-relaxed">
            "The best way to find yourself is to lose yourself in the service of others."
          </p>
          <p className="text-sm opacity-60">— Mahatma Gandhi</p>
        </div>
      </div>

      {/* Right: login form */}
      <div className="flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden flex items-center gap-2 text-primary font-bold text-2xl mb-4">
            <Flame className="w-8 h-8" /> Ember
          </div>

          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
            >
              <ArrowLeft className="w-4 h-4" /> Back to home
            </Link>
            <h2 className="text-2xl font-bold">Sign in</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Enter your credentials to access your dashboard
            </p>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-sm px-3 py-2">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@ember-ngo.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <a href="#" className="text-xs text-primary hover:underline">
                  Forgot password?
                </a>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button
              variant="hero"
              type="submit"
              size="lg"
              className="w-full text-base"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary hover:underline font-medium">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
