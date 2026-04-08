import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Flame } from "lucide-react";
import { useAuth } from "@/api/AuthContext";
import PublicNav from "@/components/PublicNav";

const Register = () => {
  const navigate = useNavigate();
  const { register, login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await register(email, password);
      // Auto-login after successful registration
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
    <PublicNav />
    <div className="flex-1 grid lg:grid-cols-2">
      {/* Left: brand panel */}
      <div className="hidden lg:flex gradient-ember flex-col justify-center items-center p-12 text-primary-foreground">
        <div className="max-w-md space-y-8 text-center">
          <Flame className="w-16 h-16 mx-auto opacity-90" />
          <h1 className="text-4xl font-extrabold leading-tight">
            Join the Ember mission
          </h1>
          <p className="text-lg opacity-90 leading-relaxed">
            Create an account to access your personalized dashboard, manage your donations, and stay connected with the causes you care about. Together, we can make a difference.
          </p>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm space-y-8">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
          <div className="lg:hidden flex items-center gap-2 text-primary font-bold text-2xl mb-4">
            <Flame className="w-8 h-8" /> Ember
          </div>

          <div>
            <h2 className="text-2xl font-bold">Create an account</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Start donating in less than a minute
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
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
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
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
    </div>
  );
};

export default Register;
