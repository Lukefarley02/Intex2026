import { Link, useLocation, useNavigate } from "react-router-dom";
import { Flame, LayoutDashboard, Users, Home, UserCircle, FileText, NotebookPen, MapPin, HeartHandshake, Shield, LogOut, Menu, X, Brain, ChevronDown, Briefcase, BarChart3, Settings } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
type Role = "Admin" | "Staff" | "Donor";

type NavItem = {
  to: string;
  icon: typeof LayoutDashboard;
  label: string;
  roles: Array<Role>;
};

type NavGroup = {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: Array<Role>;
  items: NavItem[];
};

// Standalone (ungrouped) top-level links rendered above the groups.
// Dashboard is the landing page for both Admin and Staff — at the route
// level, DashboardRouter in App.tsx swaps between the full monetary
// dashboard (Admin) and the case-worker StaffDashboard (Staff), so the
// nav item doesn't need to distinguish between them.
const topLinks: NavItem[] = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard",    roles: ["Admin", "Staff"] },
  { to: "/my-impact", icon: Users,           label: "Donor Portal", roles: ["Donor"] },
];

// Grouped nav. Each group collapses/expands. A group is only shown if the
// current user can see at least one item in it.
//
// Note: Safehouses is Admin-only in the sidebar. Staff see their assigned
// safehouse embedded on the Staff Dashboard instead, so duplicating it here
// would be clutter. The old "Staff Portal" entry was removed entirely when
// the weekly check-in UX moved onto the Staff Dashboard as a process-recording
// shortcut.
const navGroups: NavGroup[] = [
  {
    id: "case-management",
    label: "Case Management",
    icon: Briefcase,
    roles: ["Admin", "Staff"],
    items: [
      { to: "/safehouses",        icon: Home,        label: "Safehouses",        roles: ["Admin"] },
      { to: "/residents",         icon: UserCircle,  label: "Residents",         roles: ["Admin", "Staff"] },
      { to: "/process-recording", icon: NotebookPen, label: "Process Recording", roles: ["Admin", "Staff"] },
      { to: "/home-visitation",   icon: MapPin,      label: "Home Visitation",   roles: ["Admin", "Staff"] },
    ],
  },
  {
    id: "fundraising",
    label: "Fundraising",
    icon: HeartHandshake,
    roles: ["Admin", "Staff"],
    items: [
      { to: "/donors", icon: HeartHandshake, label: "Donors", roles: ["Admin", "Staff"] },
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3,
    roles: ["Admin"],
    items: [
      { to: "/reports",     icon: FileText, label: "Reports",     roles: ["Admin"] },
      { to: "/ml-insights", icon: Brain,    label: "ML Insights", roles: ["Admin"] },
    ],
  },
  {
    id: "system",
    label: "System",
    icon: Settings,
    roles: ["Admin"],
    items: [
      { to: "/admin", icon: Shield, label: "Administration", roles: ["Admin"] },
    ],
  },
];

const DashboardLayout = ({ children, title }: { children: React.ReactNode; title: string }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user, hasRole } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Resolve the single role bucket this user belongs to. Admin beats Staff
  // beats Donor — so an Admin who is also seeded as a Donor still sees the
  // full admin nav.
  const effectiveRole: Role | null = useMemo(() => {
    if (hasRole("Admin")) return "Admin";
    if (hasRole("Staff")) return "Staff";
    if (hasRole("Donor")) return "Donor";
    return null;
  }, [hasRole]);

  const visibleTopLinks = useMemo(
    () => (effectiveRole ? topLinks.filter((i) => i.roles.includes(effectiveRole)) : []),
    [effectiveRole]
  );

  const visibleGroups = useMemo(() => {
    if (!effectiveRole) return [] as NavGroup[];
    return navGroups
      .filter((g) => g.roles.includes(effectiveRole))
      .map((g) => ({
        ...g,
        items: g.items.filter((i) => i.roles.includes(effectiveRole)),
      }))
      .filter((g) => g.items.length > 0);
  }, [effectiveRole]);

  // Track which groups are expanded. Default: auto-open the group that owns
  // the current route so the user never lands on a page inside a collapsed
  // section. Other groups start collapsed so the sidebar stays compact.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const g of navGroups) {
      initial[g.id] = g.items.some((i) => i.to === location.pathname);
    }
    return initial;
  });

  // When the route changes, make sure the group containing the active link
  // is open. We never auto-close other groups — the user stays in control.
  useEffect(() => {
    const owning = navGroups.find((g) => g.items.some((i) => i.to === location.pathname));
    if (owning && !openGroups[owning.id]) {
      setOpenGroups((prev) => ({ ...prev, [owning.id]: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const toggleGroup = (id: string) =>
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));

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
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {visibleTopLinks.map((item) => {
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

        {visibleGroups.map((group) => {
          const isOpen = !!openGroups[group.id];
          const hasActive = group.items.some((i) => i.to === location.pathname);
          return (
            <div key={group.id} className="pt-2">
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wide transition-colors ${
                  hasActive
                    ? "text-sidebar-foreground"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground"
                }`}
                aria-expanded={isOpen}
              >
                <group.icon className="w-4 h-4" />
                <span className="flex-1 text-left">{group.label}</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${isOpen ? "rotate-0" : "-rotate-90"}`}
                />
              </button>
              {isOpen && (
                <div className="mt-1 ml-3 pl-3 border-l border-sidebar-border/60 space-y-1">
                  {group.items.map((item) => {
                    const active = location.pathname === item.to;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                        }`}
                      >
                        <item.icon className="w-4 h-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <button
        type="button"
        onClick={handleSignOut}
        className="flex items-center gap-2 px-6 py-4 text-sidebar-foreground/50 hover:text-sidebar-foreground text-sm border-t border-sidebar-border text-left w-full"
      >
        <LogOut className="w-4 h-4" /> Sign out
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
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
