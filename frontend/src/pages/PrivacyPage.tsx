function PrivacyPage() {
  return (
    <div style={{ maxWidth: 800 }}>
      <h1>Privacy Policy</h1>
      <p style={{ color: '#666', marginBottom: '1rem' }}>
        Last updated: {new Date().toLocaleDateString()}
      </p>

      <h2>1. Information We Collect</h2>
      <p>
        We collect information you provide directly to us, including name, email
        address, and donation history when you create an account or make a
        contribution.
      </p>

      <h2 style={{ marginTop: '1.5rem' }}>2. How We Use Your Information</h2>
      <p>
        We use the information we collect to process donations, communicate with
        supporters, and improve our services.
      </p>

      <h2 style={{ marginTop: '1.5rem' }}>3. Cookies</h2>
      <p>
        We use cookies to maintain your session and remember your preferences.
        You can manage cookie preferences through the cookie consent banner.
      </p>

      <h2 style={{ marginTop: '1.5rem' }}>4. Your Rights (GDPR)</h2>
      <p>
        You have the right to access, correct, or delete your personal data. To
        exercise these rights, contact us at privacy@intex2026.org.
      </p>

      <h2 style={{ marginTop: '1.5rem' }}>5. Contact Us</h2>
      <p>
        For privacy-related inquiries, email us at privacy@intex2026.org.
      </p>
    </div>
  );
}

export default PrivacyPage;
