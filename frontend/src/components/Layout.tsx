import { Link, Outlet } from 'react-router-dom';

function Layout() {
  return (
    <div>
      <header style={{ background: '#1a1a2e', color: '#fff', padding: '1rem 2rem' }}>
        <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1200, margin: '0 auto' }}>
          <Link to="/" style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.25rem' }}>
            Intex 2026
          </Link>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <Link to="/" style={{ color: '#ccc' }}>Home</Link>
            <Link to="/dashboard" style={{ color: '#ccc' }}>Dashboard</Link>
            <Link to="/donors" style={{ color: '#ccc' }}>Donors</Link>
            <Link to="/residents" style={{ color: '#ccc' }}>Residents</Link>
            <Link to="/login" style={{ color: '#ccc' }}>Login</Link>
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
