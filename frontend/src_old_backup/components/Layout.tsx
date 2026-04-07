import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../api/AuthContext';

function Layout() {
  const { isAuthenticated, user, logout, hasRole } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div>
      <header style={{ background: '#1a1a2e', color: '#fff', padding: '1rem 2rem' }}>
        <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1200, margin: '0 auto' }}>
          <Link to="/" style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.25rem' }}>
            Intex 2026
          </Link>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <Link to="/" style={{ color: '#ccc' }}>Home</Link>

            {/* Authenticated links — only show if logged in */}
            {isAuthenticated && (hasRole('Admin') || hasRole('Staff')) && (
              <>
                <Link to="/dashboard" style={{ color: '#ccc' }}>Dashboard</Link>
                <Link to="/donors" style={{ color: '#ccc' }}>Donors</Link>
                <Link to="/residents" style={{ color: '#ccc' }}>Residents</Link>
              </>
            )}

            {/* Auth actions */}
            {isAuthenticated ? (
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <span style={{ color: '#888', fontSize: '0.85rem' }}>{user?.email}</span>
                <button
                  onClick={handleLogout}
                  style={{
                    background: 'transparent',
                    color: '#e94560',
                    border: '1px solid #e94560',
                    padding: '0.35rem 0.75rem',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  Logout
                </button>
              </div>
            ) : (
              <>
                <Link to="/login" style={{ color: '#ccc' }}>Login</Link>
                <Link
                  to="/register"
                  style={{
                    color: '#fff',
                    background: '#e94560',
                    padding: '0.35rem 0.75rem',
                    borderRadius: 4,
                    fontSize: '0.85rem',
                  }}
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <main style={{ maxWidth: 1200, margin: '2rem auto', padding: '0 2rem' }}>
        <Outlet />
      </main>

      <footer style={{ background: '#1a1a2e', color: '#999', padding: '1rem 2rem', textAlign: 'center', marginTop: '4rem' }}>
        <Link to="/privacy" style={{ color: '#999' }}>Privacy Policy</Link>
        <span style={{ margin: '0 0.5rem' }}>|</span>
        &copy; {new Date().getFullYear()} Intex 2026
      </footer>
    </div>
  );
}

export default Layout;
