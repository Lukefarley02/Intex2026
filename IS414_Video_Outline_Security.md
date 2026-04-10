# IS 414 Video Outline — Security

**Goal:** Demonstrate EVERY security feature clearly and explicitly. If it's not shown in the video, it doesn't exist for grading. Match each section to a rubric line item. Be specific and show evidence in the browser dev tools where applicable.

---

## 1. Intro (15 sec)
- State group number and members
- Remind graders: this video covers IS 414 security requirements only

---

## 2. Availability — Deployed Publicly (4 pts)
- Show the live URL in the browser
- Navigate through several pages to prove it's not just a static landing page — the entire app is deployed and functional
- Mention the hosting platform: Microsoft Azure (App Service + Azure SQL Database)
- Optionally show that both the app AND the database are deployed (not SQLite)

---

## 3. Confidentiality — HTTPS/TLS (1.5 pts)

### 3a. HTTPS for All Public Connections (1 pt)
- Open the deployed site in Chrome
- Click the padlock icon in the address bar — show the certificate details (issued by Azure/Let's Encrypt, valid dates, domain)
- Show that the URL is `https://...`

### 3b. HTTP → HTTPS Redirect (0.5 pt)
- Type the site URL with `http://` explicitly in the address bar
- Show that it automatically redirects to `https://`
- Point out the 301/302 redirect in the Network tab of dev tools

---

## 4. Attack Mitigations — Content Security Policy (2 pts)
- Open browser dev tools → **Network tab**
- Click on any page request (the HTML document)
- Go to the **Response Headers** section
- Show the `Content-Security-Policy` header
- Read out the directives: `default-src`, `script-src`, `style-src`, `img-src`, `connect-src`, `font-src`, etc.
  Say: "This is set as an HTTP response header in our ASP.NET middleware — not a meta tag. Every response from our server includes it. It mitigates XSS by preventing the browser from loading scripts, styles, or connections from unauthorized sources."

---

## 5. Privacy (2 pts total)

### 5a. Privacy Policy (1 pt)
- Navigate to the Privacy Policy page
- Show that it's linked from the footer (at minimum on the home page)
- Scroll through to show it's GDPR-compliant and tailored to the site (not a generic template)
- Point out key sections: what data is collected, how it's used, user rights, contact info

### 5b. GDPR Cookie Consent (1 pt)
- Open the site in a fresh incognito window (or clear cookies)
- Show the cookie consent banner appearing on first visit
- **Be specific:** state whether this is cosmetic only or fully functional
  - If cosmetic: say so clearly ("This is a cosmetic notification — it informs users about cookies but does not block cookie setting before consent")
  - If fully functional: show that no non-essential cookies are set until the user clicks Accept; show the cookie list before and after in dev tools → Application → Cookies

---

## 6. Credentials — Stored Securely (1 pt)
- **Make this very obvious**
- Show the GitHub repository
- Show that NO credentials, API keys, or connection strings are in the public repo

      Show .gitignore (the file I read above). Point to these three key lines:

      appsettings.*.local.json — local dev settings
      .env and *.local — any environment files
      appsettings.Development.json — dev config with connection strings

      Show appsettings.json (the one that IS committed). Point out that ConnectionStrings is an empty block — no passwords. This is the template; real values come from the environment.
      Explain the two-layer approach:

      Local dev: developers create appsettings.Development.json or appsettings.Production.local.json on their own machines with the real connection strings. These files are gitignored and never leave the developer's laptop.
      Production: connection strings and the JWT key are set as Azure App Service Configuration environment variables. ASP.NET Core automatically picks these up because environment variables override appsettings.json values.

---

## 7. Authentication (5 pts total)

### 7a. Username/Password Authentication (3 pts)
- Show the Login page
- Enter valid credentials — show successful login and redirect to dashboard
- Enter invalid credentials — show the error message
- Show that ASP.NET Identity is the provider (mention briefly: backend uses `UserManager<ApplicationUser>`, JWT Bearer tokens)
- Show unauthenticated browsing: home page, privacy policy, donate page are all accessible without login

### 7b. Better Password Policy (1 pt)
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

### 7c. API Endpoints Require Auth Where Needed (1 pt)
- Open browser dev tools → Network tab
- Show that `/api/auth/login` and `/api/auth/me` do NOT require authentication (they'd be useless otherwise)
- Show that a CRUD endpoint (e.g., `/api/residents`) returns 401 when called without a JWT
  - Can demonstrate by opening a new incognito window and hitting the API URL directly, or using the Network tab to show the Authorization header being attached
- Show that the JWT Bearer token is attached in the `Authorization` header on authenticated requests

---

## 8. Role-Based Authorization — RBAC (1.5 pts)

### 8a. Admin Can CUD (Create, Update, Delete)
- Log in as Admin
- Create a record (e.g., new resident or new donor)
- Update a record (edit a field)
- Delete a record — show the confirmation dialog

### 8b. Donor Can Only See Their Own Data
- Log in as Donor
- Show that the donor portal displays their own donation history and impact
- Show that typing an admin URL directly (e.g., `/admin` or `/residents`) results in Access Denied / redirect

### 8c. Non-Authenticated Users See Limited Content
- Log out
- Show that the home page, privacy policy, and donate page are accessible
- Show that trying to access `/dashboard` or `/residents` redirects to login

### 8d. Staff Role (if applicable — we have it)
- Log in as Staff
- Show what Staff can and cannot see:
  - CAN see: Residents, Process Recording, Home Visitation, Case Conferences (scoped to their city)
  - CANNOT see: Donor data, Admin panel, ML Insights
  - Show the filtered sidebar as evidence

---

## 9. Integrity — Delete Confirmation (1 pt)
- Show a delete action on ANY record (resident, donor, safehouse, process recording, home visitation, intervention plan)
- Show the confirmation dialog that appears BEFORE the delete executes
- Click "Cancel" to show it can be aborted
- Click "Confirm" on a second attempt to show it works
- Mention: every delete in the entire app has this — it's a shared `ConfirmDialog` component wrapping shadcn's `AlertDialog`

---

## 10. Additional Security Features (2 pts)
Pick the strongest features to showcase. Show and explain each one clearly.

### 10a. Dark Mode via Browser-Accessible Cookie
- Go to Account Settings → Appearance
- Toggle between Light / Dark / System
- Open dev tools → Application → Cookies (or localStorage)
- Show the `ember-theme` key storing the preference
- Explain: "This is a browser-accessible setting (not httponly) that React reads to change the page theme — satisfying the cookie/storage requirement"


### 10d. HSTS (HTTP Strict Transport Security)
- Open dev tools → Network tab → Response Headers
- Show the `Strict-Transport-Security` header (e.g., `max-age=31536000; includeSubDomains`)
- Explain what it does: "This header tells the browser: once you've visited our site over HTTPS, never fall back to plain HTTP for the next 365 days — that's what the max-age of 31,536,000 seconds means. includeSubDomains extends that protection to every subdomain too. This prevents downgrade attacks where an attacker tries to strip the HTTPS and intercept traffic over an unencrypted connection. It's configured in Program.cs at line 93 with AddHsts and activated at line 580 with UseHsts()."

### 10e. Data Sanitization / Encoding
- Show that user input is sanitized or encoded to prevent injection attacks
- Example: enter `<script>alert('xss')</script>` into a form field — show that it's rendered as text, not executed
React escapes all output by default — if someone types <script>alert('xss')</script> into a form field, it renders as plain text, never as executable code. On the backend, Entity Framework uses parameterized queries so user input is never interpreted as SQL or HTML. Let me show you."

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
