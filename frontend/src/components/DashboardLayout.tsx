import { Link, useLocation } from "react-router-dom";
import { Flame, LayoutDashboard, Users, Home, UserCircle, FileText, ClipboardList, HeartHandshake, Shield, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/donors", icon: HeartHandshake, label: "Donors" },
  { to: "/safehouses", icon: Home, label: "Safehouses" },
  { to: "/residents", icon: UserCircle, label: "Residents" },
  { to: "/reports", icon: FileText, label: "Reports" },
  { to: "/staff", icon: ClipboardList, label: "Staff Portal" },
  { to: "/my-impact", icon: Users, label: "Donor Portal" },
  { to: "/admin", icon: Shield, label: "Admin" },
];

const DashboardLayout = ({ children, title }: { children: React.ReactNode; title: string }) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const SidebarContent = () => (
    <>
      <Link to="/" className="flex items-center gap-2 px-4 py-5 text-sidebar-primary font-bold text-lg border-b border-sidebar-border">
        <Flame className="w-6 h-6" /> Ember
      </Link>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`}
            >
              <item.icon className="w-4.5 h-4.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <Link to="/" className="flex items-center gap-2 px-6 py-4 text-sidebar-foreground/50 hover:text-sidebar-foreground text-sm border-t border-sidebar-border">
        <LogOut className="w-4 h-4" /> Sign out
      </Link>
    </>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 flex-col bg-sidebar fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-60 h-full bg-sidebar flex flex-col">
            <button className="absolute top-4 right-3 text-sidebar-foreground" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 lg:ml-60">
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b h-14 flex items-center px-6 gap-4">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-lg">{title}</h1>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
