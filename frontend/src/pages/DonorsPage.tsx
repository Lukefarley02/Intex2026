import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';

interface Supporter {
  supporterId: number;
  firstName: string;
  lastName: string;
  email: string | null;
  supporterType: string | null;
}

function DonorsPage() {
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Supporter[]>('/api/supporters')
      .then(setSupporters)
      .catch(() => setSupporters([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1>Donors &amp; Supporters</h1>
      {loading ? (
        <p>Loading...</p>
      ) : supporters.length === 0 ? (
        <p style={{ color: '#888' }}>No supporters found. Connect the backend to load data.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'left' }}>
              <th style={{ padding: '0.5rem' }}>Name</th>
              <th style={{ padding: '0.5rem' }}>Email</th>
              <th style={{ padding: '0.5rem' }}>Type</th>
            </tr>
          </thead>
          <tbody>
            {supporters.map((s) => (
              <tr key={s.supporterId} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '0.5rem' }}>{s.firstName} {s.lastName}</td>
                <td style={{ padding: '0.5rem' }}>{s.email ?? '—'}</td>
                <td style={{ padding: '0.5rem' }}>{s.supporterType ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default DonorsPage;
