import { Navigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/api/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: string[]; // If specified, user must have at least one of these roles
  /** When true, only top-level admins (Founders) may access this route. */
  founderOnly?: boolean;
}

function ProtectedRoute({ children, roles, founderOnly }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user, isFounder, mustChangePassword } =
    useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center text-muted-foreground"
        role="status"
        aria-label="Loading"
      >
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Hard stop for users whose account was provisioned with a temporary
  // seed password (e.g. new donors created by staff via the Log Donation
  // flow). Until they've reset it, the only page they're allowed on is
  // Account Settings. The banner on that page handles the reset flow.
  if (mustChangePassword && location.pathname !== "/account") {
    return <Navigate to="/account" replace />;
  }

  if (roles && roles.length > 0) {
    const hasRequiredRole = roles.some((role) => user?.roles.includes(role));
    if (!hasRequiredRole) {
      return (
        <div
          className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center"
          role="alert"
        >
          <h2 className="text-2xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground">
            You do not have permission to view this page.
          </p>
          <Link to="/" className="text-primary hover:underline mt-4">
            Return to dashboard
          </Link>
        </div>
      );
    }
  }

  if (founderOnly && !isFounder) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center"
        role="alert"
      >
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">
          This page is restricted to top-level administrators.
        </p>
        <Link to="/" className="text-primary hover:underline mt-4">
          Return to dashboard
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}

export default ProtectedRoute;
