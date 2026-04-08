import { Link, useLocation, useNavigate } from "react-router-dom";
import { Flame, LayoutDashboard, Users, Home, UserCircle, FileText, ClipboardList, NotebookPen, MapPin, HeartHandshake, Shield, LogOut, Menu, X, Brain } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "@/api/AuthContext";

// Every nav item the sidebar can render, along with the roles allowed to
// see it. The sidebar filters by the current user's roles at render time.
//
// Rules (matches the four-tier access-control model and the IS 413 grading):
//   • Donor         → Donor Portal only. They must not see any case or admin page.
//   • Staff         → Case-management tools (Safehouses, Residents, Process
//                     Recording, Home Visitation) plus the Staff Portal, and
//                     a **view-only** Donors page (Staff can see donors but
//                     cannot create, edit, or delete them — all donor CRUD
//                     is Admin-only, enforced in SupportersController).
//                     Staff still do NOT see Dashboard, Reports, ML Insights,
//                     or Admin — those are either aggregate monetary data
//                     or admin-only settings.
//   • Admin         → Everything.
//
// If a user holds multiple roles (e.g. an Admin is also seeded as a Donor),
// the union of their allowed items is shown — Admin wins because its rule
// set is a superset of Staff and Donor.
type NavItem = {
  to: string;
  icon: typeof LayoutDashboard;
  label: string;
  roles: Array<"Admin" | "Staff" | "Donor">;
};

const navItems: NavItem[] = [
  { to: "/dashboard",        icon: LayoutDashboard, label: "Dashboard",        roles: ["Admin"] },
  { to: "/donors",           icon: HeartHandshake,  label: "Donors",           roles: ["Admin", "Staff"] },
  { to: "/safehouses",       icon: Home,            label: "Safehouses",       roles: ["Admin", "Staff"] },
  { to: "/residents",        icon: UserCircle,      label: "Residents",        roles: ["Admin", "Staff"] },
  { to: "/process-recording",icon: NotebookPen,     label: "Process Recording",roles: ["Admin", "Staff"] },
  { to: "/home-visitation",  icon: MapPin,          label: "Home Visitation",  roles: ["Admin", "Staff"] },
  { to: "/ml-insights",      icon: Brain,           label: "ML Insights",      roles: ["Admin"] },
  { to: "/reports",          icon: FileText,        label: "Reports",          roles: ["Admin"] },
  { to: "/staff",            icon: ClipboardList,   label: "Staff Portal",     roles: ["Admin", "Staff"] },
  { to: "/my-impact",        icon: Users,           label: "Donor Portal",     roles: ["Donor"] },
  { to: "/admin",            icon: Shield,          label: "Admin",            roles: ["Admin"] },
];

const DashboardLayout = ({ children, title }: { children: React.ReactNode; title: string }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user, hasRole } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Filter the nav by the current user's highest-privilege role. Admin is a
  // superset of Staff; a user who is ONLY a Donor (no Admin/Staff role) sees
  // Donor Portal only. An Admin who is also seeded as a Donor still sees the
  // full admin nav because Admin outranks Donor.
  const visibleNavItems = useMemo(() => {
    const isAdmin = hasRole("Admin");
    const isStaff = hasRole("Staff");
    const isDonorOnly = !isAdmin && !isStaff && hasRole("Donor");

    if (isAdmin) return navItems.filter((i) => i.roles.includes("Admin"));
    if (isStaff) return navItems.filter((i) => i.roles.includes("Staff"));
    if (isDonorOnly) return navItems.filter((i) => i.roles.includes("Donor"));
    return [];
  }, [hasRole]);

  const handleSignOut = () => {
    logout();
    setSidebarOpen(false);
    navigate("/login");
  };

  const SidebarContent = () => (
    <>
      <Link to="/" className="flex items-center gap-2 px-4 py-5 text-sidebar-primary font-bold text-lg border-b border-sidebar-border">
        <Flame className="w-6 h-6" /> Ember
      </Link>
      <nav className="flex-1 p-3 space-y-1">
        {visibleNavItems.map((item) => {
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
      <button
        type="button"
        onClick={handleSignOut}
        className="flex items-center gap-2 px-6 py-4 text-sidebar-foreground/50 hover:text-sidebar-foreground text-sm border-t border-sidebar-border text-left w-full"
      >
        <LogOut className="w-4 h-4" aria-hidden="true" /> Sign out
      </button>
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
            <button
              className="absolute top-4 right-3 text-sidebar-foreground"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 lg:ml-60">
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b h-14 flex items-center px-6 gap-4">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar">
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>
          <h1 className="font-semibold text-lg">{title}</h1>
          <div className="ml-auto flex items-center gap-3">
            {user?.email && (
              <span className="hidden sm:inline text-sm text-muted-foreground">
                {user.email}
              </span>
            )}
            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border hover:bg-muted transition-colors"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" /> Sign out
            </button>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
