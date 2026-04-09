import { useState, useEffect } from 'react';

function CookieConsent() {
  const [visible, setVisible] = useState(false);

  // On mount, check if user has already made a choice
  useEffect(() => {
    const consent = document.cookie
      .split('; ')
      .find(row => row.startsWith('cookie_consent='));

    // If no choice has been made yet, show the banner
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    // Save their choice as a cookie that lasts 1 year
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    document.cookie = `cookie_consent=accepted; expires=${expires.toUTCString()}; path=/; SameSite=Strict`;
    setVisible(false);
  };

  const handleDecline = () => {
    // Save their decline choice — expires when browser closes
    document.cookie = `cookie_consent=declined; path=/; SameSite=Strict`;
    setVisible(false);
  };

  // Don't render anything if banner shouldn't show
  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: '#1a1a2e',
      color: '#fff',
      padding: '1rem 2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '1rem',
      zIndex: 9999,
      boxShadow: '0 -2px 10px rgba(0,0,0,0.3)',
      flexWrap: 'wrap',
    }}>
      <p style={{ margin: 0, fontSize: '0.9rem', color: '#ccc', flex: 1 }}>
        We use cookies to keep you logged in and remember your preferences.
        See our{' '}
        <a href="/privacy" style={{ color: '#e94560' }}>
          Privacy Policy
        </a>
        {' '}for details.
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
        <button
          onClick={handleDecline}
          style={{
            background: 'transparent',
            color: '#ccc',
            border: '1px solid #555',
            padding: '0.5rem 1.25rem',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: '0.85rem',
          }}
        >
          Decline
        </button>
        <button
          onClick={handleAccept}
          style={{
            background: '#e94560',
            color: '#fff',
            border: 'none',
            padding: '0.5rem 1.25rem',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 'bold',
          }}
        >
          Accept
        </button>
      </div>
    </div>
  );
}

export default CookieConsent;
