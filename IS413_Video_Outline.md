# IS 413 Video Outline — Enterprise Application Development

**Goal:** Walk graders through every required page and feature. Be thorough but concise. Show the live deployed site at high resolution throughout.

---

## 1. Intro (30 sec)
- State group number and members
- Show the deployed URL in the browser address bar (proves public deployment)
- Mention tech stack: .NET 10 / C# backend, React + TypeScript + Vite frontend, Azure SQL Database, deployed on Microsoft Azure

---

## 2. Public (Non-Authenticated) Pages (~3 min)

### 2a. Home / Landing Page
- Show the full landing page scroll — wordmark, hero, mission statement, calls to action
- Point out the three live stat pills (girls sheltered, safehouse count, retention rate) pulling from Azure SQL
- Show the safehouse grid (name, city, region, capacity, active count — no PII)
- Show the "How we care" section with animated percentage counters
- Demonstrate responsive design: resize browser or show mobile view

### 2b. Impact / Donor-Facing Dashboard (Public)
- Show the aggregated, anonymized impact data visible to unauthenticated visitors
- Explain what data is shown vs. hidden (no resident-identifying info)

### 2c. Login Page
- Show the login form with validation and error handling
- Demonstrate an incorrect password attempt (show error message)
- Mention that there is no separate registration page — new accounts are created through the donation flow (show briefly)

### 2d. Privacy Policy + Cookie Consent
- Scroll through the GDPR-compliant privacy policy page
- Show the cookie consent banner on first visit
- Note: defer detailed cookie consent discussion to IS 414 video

### 2e. Donate Page (Public)
- Walk through the donation form (amount, monthly toggle, anonymous option, campaign, safehouse designation via dropdown)
- Submit a test donation — show the confirmation chime and thank-you screen
- Show the account creation prompt (inline password dialog) that appears after donation
- Explain: this is the only path for new donor accounts

---

## 3. Donor Portal (~2 min)

### 3a. Donor Dashboard / My Impact
- Log in as the donor test account (donor@ember.org)
- Show the hero banner with donor name, total contributions, care metrics
- Show the four stat cards (Care Provided, Girl-Years Funded, Total Given, Donations Made)
- Explain the honest impact math (months of care, not inflated "girls helped")

### 3b. Donation History
- Show the scrollable donation history table with dates, amounts, campaigns, safehouse designations
- Point out in-kind donation badges and estimated value display

### 3c. Active Campaigns
- Show campaigns with progress bars and Contribute buttons

### 3d. Messages Inbox
- Show the collapsible messages strip with unread count badge
- Open a message — show full body and mark-as-read behavior

### 3e. Tax Receipt Generation
- Click "Generate tax receipt" button
- Show the year picker and the rendered IRS-style written acknowledgment
- Show the separate Cash vs. Non-Cash tables and Form 8283 notice (if applicable)
- Demonstrate Print / Save as PDF via browser dialog

### 3f. Safehouse Designation
- Show the safehouse dropdown selector and how it labels gifts in history

---

## 4. Admin / Staff Portal (~5 min)

### 4a. Admin Dashboard
- Log in as the admin test account
- Show the four KPI cards (Active Donors, Total Donations YTD, Monthly Donations, Donor Retention) — all live from Azure SQL
- Show the Social Media Overview card (note: mock data, no social_media_posts table yet)
- Show the Recent Activity feed
- Point out that the dashboard fits the viewport (no scroll needed for primary content)

### 4b. Donors & Contributions
- Show the donor list with filter pills (All / Monetary / In-Kind), search box, and risk-filter pills (All / Active / Watch / At risk)
- Demonstrate CRUD:
  - **Create**: Add a new donor via the form (show required fields: name or org, email, region, country)
  - **Edit**: Click the pencil icon, change a field, save
  - **Delete**: Click the trash icon, show the confirmation dialog, confirm
- Show the "Log donation" flow (the wizard: type → match donor → gift details → success)
- Show the "Send message" dialog with templates (Thank You / Donation Appeal)
- Show the "Message all" bulk send for filtered donors

### 4c. Caseload Inventory (Residents)
- Show the resident card list
- Demonstrate filters: Case status dropdown, Safehouse dropdown, Priority dropdown, search box
- Show "Clear filters" button behavior
- Show the risk badge color coding (low/medium/high/critical)
- Show the derived case stage mapping (Intake / Program / Exit prep / Follow-up)
- Demonstrate CRUD:
  - **Create**: New resident form (10 editable fields + full entity round-trip)
  - **Edit**: Pencil icon → edit form → save
  - **Delete**: Trash icon → confirmation dialog → confirm (Admin only)
- Note that occupancy auto-recalculates when residents are added/moved/deleted

### 4d. Process Recording
- Show the chronological card list of counseling session notes
- Show the resident filter dropdown
- Demonstrate full CRUD:
  - **Create**: New record modal (session date, social worker, session type, emotional state, narrative, interventions, follow-up)
  - **Edit**: Pencil icon (only visible on records the user created, or all for Admin)
  - **Delete**: Trash icon with confirmation dialog
- Point out per-author ownership: staff can only edit/delete their own records

### 4e. Home Visitation & Case Conferences
- Show the split view: Upcoming visits/conferences vs. Past visit history
- Show the resident filter
- Demonstrate full CRUD (same pattern as Process Recording)
- Point out per-author ownership for staff
- Show visit types (initial assessment, routine follow-up, reintegration assessment, etc.)

### 4f. Case Conferences & Intervention Plans
- Show the dedicated Case Conferences page
- Show grouping by conference date, filter by category/status/resident
- Show summary stat cards (total plans, by status, by category)
- Demonstrate CRUD on intervention plans

### 4g. Reports & Analytics
- Show the Reports page with date range picker
- Walk through each section:
  - Annual Accomplishment Report header (Caring / Healing / Teaching pillars)
  - Donation trends (monthly bar chart, by type, by campaign, allocation by safehouse)
  - Safehouse performance comparison table
  - Resident outcomes (case status, category, sub-category breakdown)
  - Reintegration success (count, rate, type breakdown)
- Note this is all live data, not mock

### 4h. Print/PDF Export
- On the Safehouses page, click "Print Report"
- Show the print preview with the clean table layout (9 columns)
- Mention browser Save as PDF capability

---

## 5. Staff-Specific Experience (~1 min)
- Log in as staff test account
- Show the Staff Dashboard (profile card, safehouse card with occupancy, upcoming/recent events feed)
- Show that the sidebar is filtered — Staff only sees: Dashboard, Safehouses (embedded), Residents, Process Recording, Home Visitation, Case Conferences
- Show the "Log donation" button on the Staff Dashboard
- Show the staff-only early return on the Donors page (just a "Log a donation" hero + lock note)

### 5a. Temporary-Password Donor Onboarding
- From Staff Dashboard, open "Log donation"
- Create a new donor with email in the wizard
- Show the generated 14-character temporary password in the success step
- Show the copy-to-clipboard button
- Log in as that new donor — show the forced redirect to Account Settings with the amber "change password" banner

---

## 6. Four-Tier Access Control (~1 min)
- Briefly explain the four tiers: Founder, Regional Manager, Location Manager, Staff
- Show that each tier sees appropriately scoped data (safehouses, residents, supporters filtered by region/city)
- Show that ML Insights is Founder-only (typing the URL as a non-Founder shows Access Denied)

---

## 7. Quality & Polish (~1 min)
- Show dark mode toggle in Account Settings (Light / Dark / System)
- Show the Ember brand consistency (palette, gradients, Inter font)
- Show responsive design (resize or mobile view)
- Show error handling on a form (validation messages)
- Show the sidebar collapsible categories with auto-expand on current route
- Mention: titles, icons (lucide-react), consistent look and feel, viewport-fit dashboards

---

## 8. Wrap-Up (15 sec)
- Summarize: all required pages built, all live data from Azure SQL, deployed publicly
- State the deployed URL one more time
