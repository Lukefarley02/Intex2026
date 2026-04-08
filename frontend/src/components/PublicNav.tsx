import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Flame, Menu, X, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { useAuth, landingFor } from "@/api/AuthContext";

const PublicNav = () => {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const dashboardHref = landingFor(user?.roles);

  return (
    <nav aria-label="Main navigation" className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary">
          <Flame className="w-7 h-7" aria-hidden="true" />
          Ember
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a href="#mission-section" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Mission</a>
          <a href="#how-we-care" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Impact</a>
          <a href="#impact" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Safehouses</a>
          {isAuthenticated ? (
            <Link to={dashboardHref}>
              <Button variant="ghost" size="sm" className="gap-1.5">
                <LayoutDashboard className="w-4 h-4" /> My Dashboard
              </Button>
            </Link>
          ) : (
            <Link to="/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
          )}
          <Link to="/donate">
            <Button variant="hero" size="sm">Support a girl</Button>
          </Link>
        </div>

        <button
          className="md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
        </button>
      </div>

      {open && (
        <div id="mobile-menu" className="md:hidden bg-card border-b p-4 space-y-3">
          <a href="#mission-section" className="block text-sm font-medium text-muted-foreground">Mission</a>
          <a href="#how-we-care" className="block text-sm font-medium text-muted-foreground">Impact</a>
          <a href="#impact" className="block text-sm font-medium text-muted-foreground">Safehouses</a>
          {isAuthenticated ? (
            <Link to={dashboardHref} className="block">
              <Button variant="ghost" className="w-full gap-1.5">
                <LayoutDashboard className="w-4 h-4" /> My Dashboard
              </Button>
            </Link>
          ) : (
            <Link to="/login" className="block">
              <Button variant="ghost" className="w-full">Log in</Button>
            </Link>
          )}
          <Link to="/donate" className="block"><Button variant="hero" className="w-full">Support a girl</Button></Link>
        </div>
      )}
    </nav>
  );
};

export default PublicNav;
