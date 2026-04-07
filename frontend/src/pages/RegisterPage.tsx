import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../api/AuthContext';

function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await register(email, password);
      // After successful registration, redirect to login
      navigate('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '2rem auto' }}>
      <h1>Register</h1>

      {error && (
        <div style={{ background: '#fee', color: '#c00', padding: '0.75rem', borderRadius: 4, marginTop: '1rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
        <div>
          <label htmlFor="email" style={{ display: 'block', marginBottom: 4 }}>Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            style={{ width: '100%', padding: '0.5rem', borderRadius: 4, border: '1px solid #ccc' }}
          />
        </div>
        <div>
          <label htmlFor="password" style={{ display: 'block', marginBottom: 4 }}>Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={12}
            autoComplete="new-password"
            style={{ width: '100%', padding: '0.5rem', borderRadius: 4, border: '1px solid #ccc' }}
          />
          <small style={{ color: '#888' }}>
            Minimum 12 characters, must include uppercase, lowercase, digit, and special character.
          </small>
        </div>
        <div>
          <label htmlFor="confirmPassword" style={{ display: 'block', marginBottom: 4 }}>Confirm Password</label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            style={{ width: '100%', padding: '0.5rem', borderRadius: 4, border: '1px solid #ccc' }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{
            background: loading ? '#666' : '#16213e',
            color: '#fff',
            padding: '0.75rem',
            border: 'none',
            borderRadius: 4,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
          }}
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <p style={{ marginTop: '1rem', textAlign: 'center', color: '#666' }}>
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </div>
  );
}

export default RegisterPage;
