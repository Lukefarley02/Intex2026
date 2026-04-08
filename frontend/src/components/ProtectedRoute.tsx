import { Navigate } from "react-router-dom";
import { useAuth } from "@/api/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: string[]; // If specified, user must have at least one of these roles
  /** When true, only top-level admins (Founders) may access this route. */
  founderOnly?: boolean;
}

function ProtectedRoute({ children, roles, founderOnly }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user, isFounder } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && roles.length > 0) {
    const hasRequiredRole = roles.some((role) => user?.roles.includes(role));
    if (!hasRequiredRole) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-2 p-8 text-center">
          <h2 className="text-2xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground">
            You do not have permission to view this page.
          </p>
        </div>
      );
    }
  }

  if (founderOnly && !isFounder) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2 p-8 text-center">
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">
          This page is restricted to top-level administrators.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

export default ProtectedRoute;
