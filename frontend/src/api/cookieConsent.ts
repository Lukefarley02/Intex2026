/**
 * Shared cookie-consent helpers.
 *
 * GDPR requires that non-essential cookies (theme preference, sidebar state,
 * etc.) are NOT written until the user explicitly accepts.  Essential cookies
 * (e.g. the consent cookie itself, session auth tokens) are exempt.
 *
 * Any module that wants to persist user preferences in a cookie should call
 * `hasConsentedToCookies()` before reading/writing.
 */

/** Returns true only when the user has explicitly clicked "Accept". */
export function hasConsentedToCookies(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split("; ")
    .some((row) => row === "cookie_consent=accepted");
}
