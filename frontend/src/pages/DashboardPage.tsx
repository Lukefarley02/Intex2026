function DashboardPage() {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Overview of active residents, recent donations, and key metrics.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
        {[
          { label: 'Active Residents', value: '—' },
          { label: 'Donations This Month', value: '—' },
          { label: 'Active Safehouses', value: '—' },
          { label: 'Upcoming Conferences', value: '—' },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              background: '#fff',
              padding: '1.5rem',
              borderRadius: 8,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{card.value}</div>
            <div style={{ color: '#888' }}>{card.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DashboardPage;
