import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';

interface Resident {
  residentId: number;
  firstName: string;
  lastName: string;
  status: string | null;
  riskLevel: string | null;
  safehouse?: { name: string };
}

function ResidentsPage() {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Resident[]>('/api/residents')
      .then(setResidents)
      .catch(() => setResidents([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1>Caseload Inventory</h1>
      {loading ? (
        <p>Loading...</p>
      ) : residents.length === 0 ? (
        <p style={{ color: '#888' }}>No residents found. Connect the backend to load data.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'left' }}>
              <th style={{ padding: '0.5rem' }}>Name</th>
              <th style={{ padding: '0.5rem' }}>Status</th>
              <th style={{ padding: '0.5rem' }}>Risk Level</th>
              <th style={{ padding: '0.5rem' }}>Safehouse</th>
            </tr>
          </thead>
          <tbody>
            {residents.map((r) => (
              <tr key={r.residentId} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '0.5rem' }}>{r.firstName} {r.lastName}</td>
                <td style={{ padding: '0.5rem' }}>{r.status ?? '—'}</td>
                <td style={{ padding: '0.5rem' }}>{r.riskLevel ?? '—'}</td>
                <td style={{ padding: '0.5rem' }}>{r.safehouse?.name ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default ResidentsPage;
