function HomePage() {
  return (
    <div>
      <section style={{ textAlign: 'center', padding: '4rem 0' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
          Empowering Survivors. Restoring Hope.
        </h1>
        <p style={{ fontSize: '1.2rem', color: '#555', maxWidth: 600, margin: '0 auto 2rem' }}>
          We operate safe homes and rehabilitation services for girls who are
          survivors of sexual abuse and sex trafficking, in regions that lack
          similar services.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <a
            href="#impact"
            style={{
              background: '#e94560',
              color: '#fff',
              padding: '0.75rem 2rem',
              borderRadius: 8,
              fontWeight: 'bold',
            }}
          >
            See Our Impact
          </a>
          <a
            href="#donate"
            style={{
              background: '#16213e',
              color: '#fff',
              padding: '0.75rem 2rem',
              borderRadius: 8,
              fontWeight: 'bold',
            }}
          >
            Donate Now
          </a>
        </div>
      </section>

      <section id="impact" style={{ padding: '2rem 0' }}>
        <h2>Impact Dashboard</h2>
        <p style={{ color: '#666' }}>
          Anonymized aggregate data showing the difference your support makes.
          (Coming soon)
        </p>
      </section>
    </div>
  );
}

export default HomePage;
