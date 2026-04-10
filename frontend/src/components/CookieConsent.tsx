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
    <div
      role="dialog"
      aria-label="Cookie consent banner"
      className="fixed bottom-0 left-0 right-0 bg-foreground text-card p-4 sm:p-6 flex flex-wrap justify-between items-center gap-4 z-[9999] shadow-lg dark:shadow-2xl"
    >
      <p className="text-sm text-muted flex-1">
        We use cookies to keep you logged in and remember your preferences.
        See our{' '}
        <a
          href="/privacy"
          className="text-primary hover:text-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-foreground rounded"
        >
          Privacy Policy
        </a>
        {' '}for details.
      </p>

      <div className="flex gap-3 flex-shrink-0">
        <button
          onClick={handleDecline}
          className="px-5 py-2 text-sm bg-transparent border border-muted text-muted hover:text-card hover:border-card rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
        >
          Decline
        </button>
        <button
          onClick={handleAccept}
          className="px-5 py-2 text-sm font-bold bg-primary text-card hover:bg-primary-light rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
        >
          Accept
        </button>
      </div>
    </div>
  );
}

export default CookieConsent;
