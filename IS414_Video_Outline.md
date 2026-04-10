# IS 414 Video Outline — Security

**Goal:** Demonstrate EVERY security feature clearly and explicitly. If it's not shown in the video, it doesn't exist for grading. Match each section to a rubric line item. Be specific and show evidence in the browser dev tools where applicable.

---

## 1. Intro (15 sec)
- State group number and members
- Remind graders: this video covers IS 414 security requirements only

---

## 2. Confidentiality — HTTPS/TLS (1.5 pts)

### 2a. HTTPS for All Public Connections (1 pt)
- Open the deployed site in Chrome
- Click the padlock icon in the address bar — show the certificate details (issued by Azure/Let's Encrypt, valid dates, domain)
- Show that the URL is `https://...`

### 2b. HTTP → HTTPS Redirect (0.5 pt)
- Type the site URL with `http://` explicitly in the address bar
- Show that it automatically redirects to `https://`
- Point out the 301/302 redirect in the Network tab of dev tools

---

## 3. Authentication (5 pts total)

### 3a. Username/Password Authentication (3 pts)
- Show the Login page
- Enter valid credentials — show successful login and redirect to dashboard
- Enter invalid credentials — show the error message
- Show that ASP.NET Identity is the provider (mention briefly: backend uses `UserManager<ApplicationUser>`, JWT Bearer tokens)
- Show unauthenticated browsing: home page, privacy policy, donate page are all accessible without login

### 3b. Better Password Policy (1 pt)
- **Be very explicit here — this is strictly graded**
- Open Account Settings or the donation account-creation flow
- Attempt to set a weak password — show the rejection
- Show the specific policy enforced:
  - Minimum length: 14 characters (exceeds the ASP.NET Identity default of 6)
  - Requires uppercase letter
  - Requires lowercase letter
  - Requires digit
  - Requires non-alphanumeric symbol
- Mention: these values are configured in `Program.cs` via `IdentityOptions.Password` and exceed all defaults
- Demonstrate with a failing attempt (e.g., "short1!" — too short) and then a passing attempt

### 3c. API Endpoints Require Auth Where Needed (1 pt)
- Open browser dev tools → Network tab
- Show that `/api/auth/login` and `/api/auth/me` do NOT require authentication (they'd be useless otherwise)
- Show that a CRUD endpoint (e.g., `/api/residents`) returns 401 when called without a JWT
  - Can demonstrate by opening a new incognito window and hitting the API URL directly, or using the Network tab to show the Authorization header being attached
- Show that the JWT Bearer token is attached in the `Authorization` header on authenticated requests

---

## 4. Role-Based Authorization — RBAC (1.5 pts)

### 4a. Admin Can CUD (Create, Update, Delete)
- Log in as Admin
- Create a record (e.g., new resident or new donor)
- Update a record (edit a field)
- Delete a record — show the confirmation dialog

### 4b. Donor Can Only See Their Own Data
- Log in as Donor
- Show that the donor portal displays their own donation history and impact
- Show that typing an admin URL directly (e.g., `/admin` or `/residents`) results in Access Denied / redirect

### 4c. Non-Authenticated Users See Limited Content
- Log out
- Show that the home page, privacy policy, and donate page are accessible
- Show that trying to access `/dashboard` or `/residents` redirects to login

### 4d. Staff Role (if applicable — we have it)
- Log in as Staff
- Show what Staff can and cannot see:
  - CAN see: Residents, Process Recording, Home Visitation, Case Conferences (scoped to their city)
  - CANNOT see: Donor data, Admin panel, ML Insights
  - Show the filtered sidebar as evidence

---

## 5. Integrity — Delete Confirmation (1 pt)
- Show a delete action on ANY record (resident, donor, safehouse, process recording, home visitation, intervention plan)
- Show the confirmation dialog that appears BEFORE the delete executes
- Click "Cancel" to show it can be aborted
- Click "Confirm" on a second attempt to show it works
- Mention: every delete in the entire app has this — it's a shared `ConfirmDialog` component wrapping shadcn's `AlertDialog`

---

## 6. Credentials — Stored Securely (1 pt)
- **Make this very obvious**
- Show the GitHub repository
- Show that NO credentials, API keys, or connection strings are in the public repo
  - Search the repo for "password" or "connectionstring" — show nothing sensitive
- Explain how credentials are managed:
  - `appsettings.*.local.json` files (gitignored) for local development
  - Azure App Service environment variables / configuration for production
  - Show the `.gitignore` entry for `*.local.json` and `.env`
- Optionally show the Azure portal App Service Configuration blade (environment variables) with values masked

---

## 7. Privacy (2 pts total)

### 7a. Privacy Policy (1 pt)
- Navigate to the Privacy Policy page
- Show that it's linked from the footer (at minimum on the home page)
- Scroll through to show it's GDPR-compliant and tailored to the site (not a generic template)
- Point out key sections: what data is collected, how it's used, user rights, contact info

### 7b. GDPR Cookie Consent (1 pt)
- Open the site in a fresh incognito window (or clear cookies)
- Show the cookie consent banner appearing on first visit
- **Be specific:** state whether this is cosmetic only or fully functional
  - If cosmetic: say so clearly ("This is a cosmetic notification — it informs users about cookies but does not block cookie setting before consent")
  - If fully functional: show that no non-essential cookies are set until the user clicks Accept; show the cookie list before and after in dev tools → Application → Cookies

---

## 8. Attack Mitigations — Content Security Policy (2 pts)
- Open browser dev tools → **Network tab**
- Click on any page request (the HTML document)
- Go to the **Response Headers** section
- Show the `Content-Security-Policy` header
- Read out the directives: `default-src`, `script-src`, `style-src`, `img-src`, `connect-src`, `font-src`, etc.
- Explain briefly: "We only allow sources that our app needs — our own domain plus CDN for fonts/icons. This mitigates XSS and data injection attacks."
- **Emphasize:** this is an HTTP header, NOT a `<meta>` tag — show it in the response headers to prove it

---

## 9. Availability — Deployed Publicly (4 pts)
- Show the live URL in the browser
- Navigate through several pages to prove it's not just a static landing page — the entire app is deployed and functional
- Mention the hosting platform: Microsoft Azure (App Service + Azure SQL Database)
- Optionally show that both the app AND the database are deployed (not SQLite)

---

## 10. Additional Security Features (2 pts)
Pick the strongest features to showcase. Show and explain each one clearly.

### 10a. Dark Mode via Browser-Accessible Cookie
- Go to Account Settings → Appearance
- Toggle between Light / Dark / System
- Open dev tools → Application → Cookies (or localStorage)
- Show the `ember-theme` key storing the preference
- Explain: "This is a browser-accessible setting (not httponly) that React reads to change the page theme — satisfying the cookie/storage requirement"

### 10b. Third-Party Authentication
- Show the third-party auth option on the login page (e.g., Google OAuth)
- Demonstrate logging in with a third-party provider
- (If not implemented, skip this — don't fake it)

### 10c. Two-Factor / Multi-Factor Authentication
- Show an account that HAS MFA enabled
- Demonstrate the MFA challenge during login
- Remind graders: the admin and donor test accounts provided do NOT have MFA, per the submission requirements, so graders can log in without a phone
- (If not implemented, skip — be forthright)

### 10d. HSTS (HTTP Strict Transport Security)
- Open dev tools → Network tab → Response Headers
- Show the `Strict-Transport-Security` header (e.g., `max-age=31536000; includeSubDomains`)
- Explain what it does: tells browsers to only use HTTPS for future visits

### 10e. Data Sanitization / Encoding
- Show that user input is sanitized or encoded to prevent injection attacks
- Example: enter `<script>alert('xss')</script>` into a form field — show that it's rendered as text, not executed
- Mention: React's JSX escapes by default, and the backend validates/sanitizes input

### 10f. Real DBMS (Not SQLite)
- Mention that both the operational database AND the identity database are on Azure SQL (a real DBMS)
- Optionally show the Azure portal with both databases visible

### 10g. Other Features Worth Mentioning
- Four-tier scope-based access control (Founder / Regional / Location / Staff) beyond basic RBAC
- `notesRestricted` field stripped from non-Admin API responses (data-level security)
- Temporary passwords generated with cryptographic randomness (`RandomNumberGenerator`)
- `MustChangePassword` flag forcing password rotation on first login
- Security stamp rotation on password change (invalidates other active sessions)
- JWT token-based auth with proper expiration

---

## 11. Wrap-Up (15 sec)
- Summarize the security features covered
- Remind graders of the test credentials provided in the submission form
- State the deployed URL
