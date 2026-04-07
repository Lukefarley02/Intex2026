import { Navigate } from 'react-router-dom';
import { useAuth } from '../api/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: string[];  // If specified, user must have at least one of these roles
}

function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If specific roles are required, check them
  if (roles && roles.length > 0) {
    const hasRequiredRole = roles.some((role) => user?.roles.includes(role));
    if (!hasRequiredRole) {
      return (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h2>Access Denied</h2>
          <p style={{ color: '#888' }}>You do not have permission to view this page.</p>
        </div>
      );
    }
  }

  return <>{children}</>;
}

export default ProtectedRoute;
