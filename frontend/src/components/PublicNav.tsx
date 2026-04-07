import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Flame, Menu, X } from "lucide-react";
import { useState } from "react";

const PublicNav = () => {
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary">
          <Flame className="w-7 h-7" />
          Ember
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a href="#mission" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Mission</a>
          <a href="#impact" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Impact</a>
          <a href="#safehouses" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Safehouses</a>
          <Link to="/login">
            <Button variant="ghost" size="sm">Log in</Button>
          </Link>
          <Link to="/donate">
            <Button variant="hero" size="sm">Support a girl</Button>
          </Link>
        </div>

        <button className="md:hidden" onClick={() => setOpen(!open)}>
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-card border-b p-4 space-y-3">
          <a href="#mission" className="block text-sm font-medium text-muted-foreground">Mission</a>
          <a href="#impact" className="block text-sm font-medium text-muted-foreground">Impact</a>
          <Link to="/login" className="block"><Button variant="ghost" className="w-full">Log in</Button></Link>
          <Link to="/donate" className="block"><Button variant="hero" className="w-full">Support a girl</Button></Link>
        </div>
      )}
    </nav>
  );
};

export default PublicNav;
