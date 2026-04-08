# CLAUDE.md — AI Agent Instructions

This file is read automatically by Claude Code and other AI coding agents. It tells the agent how this project works so it can be productive immediately. Other AI tools (Copilot, ChatGPT, Cursor, etc.) should also read this file first.

---

## Project summary

University capstone (INTEX W26) — a full-stack nonprofit case management and donor management web app. Graded across four classes simultaneously: IS 401 (project mgmt), IS 413 (full-stack dev), IS 414 (security), IS 455 (machine learning). **Due Friday April 10, 2026 at 10:00am.**

## Repository layout

```
Website/Intex2026/
├── backend/          .NET 10 Web API (C#)
├── frontend/         React + Vite + TypeScript
├── ARCHITECTURE.md   Project structure, packages, and schema gap table
├── CONTRIBUTING.md   How to add a feature end-to-end
├── API_REFERENCE.md  Existing endpoints and response shapes
├── DATA_DICTIONARY.md  Full schema → model mapping with status
└── Intex2026.sln     Solution file
```

One level up (workspace root):
```
lighthouse_schema.sql       Full SQL Server DDL (17 tables)
lighthouse_csv_v7/          17 CSV seed data files
plan.md                     Single source of truth — all decisions, progress, requirements
```

## Critical rules — read before changing anything

1. **plan.md is the source of truth.** Read it before starting work. Do not contradict decisions logged there.
2. **Do not invent an organization name.** It is TBD. Use a placeholder like "[Org Name]" if needed.
3. **Password policy values — do not suggest defaults.** The class requires exceeding ASP.NET Identity defaults. The team will set specific values. Do not hardcode password rules.
4. **.NET 10 requires Swashbuckle for Swagger.** It is no longer built-in. The NuGet package `Swashbuckle.AspNetCore 7.2.0` is already in the csproj. Do not remove it.
5. **Content-Security-Policy must be an HTTP header, not a meta tag.** Already wired in Program.cs middleware. Graders check browser dev tools.
6. **Sensitive fields are admin-only.** `notes_restricted` (residents) and `medical_notes_restricted` (health records) must never be returned to Staff or Donor roles.
7. **Every delete must have a confirmation dialog.** No silent deletes anywhere.
8. **No secrets in the repo.** Connection strings with real credentials go in appsettings.*.local.json (gitignored) or environment variables. Never commit .env files.
9. **lighthouse_schema.sql is the canonical schema.** When expanding models, match column names, types, and constraints from that file exactly.
10. **Frontend proxy assumes backend on https://localhost:5001.** If the backend port changes, update `frontend/vite.config.ts` proxy target.
11. **Frontend build is `tsc --noEmit && vite build`, NOT `tsc -b`.** `tsc -b` is build mode for composite projects with references; our `tsconfig.json` is flat. Do not change this script back.
12. **Do not run `npm audit fix --force`.** It wants to upgrade vitest 2 → 4 (a two-major-version jump) to silence 5 moderate advisories that all trace back to a single esbuild dev-server flaw (GHSA-67mh-4wv8-2f99). The flaw is dev-only and does not ship to production. Decision is to defer until after submission. See the "Known dependency advisories" note below.

## Documentation maintenance — required after every change

Any AI agent or developer working on this project MUST update the relevant documentation 
files after making any change. Do not consider a task complete until the docs reflect 
the current state of the code.

### When to update each file

**Update `CLAUDE.md`** when:
- A new technology, tool, or package is added to the project
- A new critical rule needs to be enforced
- The current state section changes (something moves from 🔲 to ✅)
- A new role, test account, or auth pattern is added
- The project structure changes significantly
- Any new convention or pattern is established that future agents should follow

**Update `ARCHITECTURE.md`** when:
- A new file or folder is created
- A new controller is added
- A new model is created
- A package is added or removed
- The schema gap table changes (a table moves from Missing to Stub to Complete)

**Update `API_REFERENCE.md`** when:
- A new endpoint is created
- An existing endpoint's request or response shape changes
- Auth requirements change on any endpoint
- An endpoint is deleted or deprecated

**Update `DATA_DICTIONARY.md`** when:
- A model is expanded to include more columns
- A table's status changes (Missing → Stub → Complete)
- A new model is created
- Column mappings change

**Update `CONTRIBUTING.md`** when:
- The process for adding a new feature changes
- New steps are required in the development workflow
- New gotchas or common errors are discovered

### How to update

At the end of every task, before reporting completion:
1. Review which files were created or modified
2. Identify which documentation files are affected using the guide above
3. Update those documentation files to reflect the current state
4. In your completion summary, explicitly list which docs were updated and what changed

### Current state tracking

The "Current state" section in CLAUDE.md uses this format:
- ✅ = fully built and tested
- 🔲 = not yet started or not yet complete

Always update this section to reflect reality. If something is partially done, 
keep it as 🔲 and add a note explaining what's left.

### Never leave docs stale

If you find that the documentation doesn't match the code, fix the documentation 
as part of your current task even if you weren't asked to. Stale documentation 
causes every future agent to make wrong assumptions and waste time.

## Tech stack (locked — do not suggest alternatives)

| Layer | Technology |
|---|---|
| Backend | .NET 10 / C# / EF Core |
| Frontend | React 18 + TypeScript + Vite 6 |
| Routing | react-router-dom v6 |
| Styling | Tailwind CSS 3 + shadcn/ui (Radix primitives) |
| Icons | lucide-react |
| Server state | @tanstack/react-query |
| Forms | react-hook-form + zod |
| Testing (frontend) | Vitest 2 + @testing-library/react + jsdom |
| Database | SQL Server (Azure SQL for production) |
| Auth | ASP.NET Identity + JWT Bearer (fully implemented & audited) |
| Swagger | Swashbuckle.AspNetCore 7.2.0 |
| Deployment | Microsoft Azure |
| ML | Python / Jupyter notebooks (separate ml-pipelines/ folder) |

## Coding conventions

### Backend (C#)
- Namespace: `Intex2026.Api.*` (e.g., `Intex2026.Api.Models`, `Intex2026.Api.Controllers`)
- Models: PascalCase properties, one class per file, file name matches class name, `[Table]` and `[Column]` attributes for explicit SQL mapping
- Table mapping: `modelBuilder.Entity<X>().ToTable("snake_case_table_name")` in AppDbContext (plus `[Column("snake_case")]` on each property)
- Controllers: RESTful, `[ApiController]` attribute, route pattern `api/[controller]`
- All async — use `async Task<ActionResult<T>>` pattern

### Frontend (TypeScript/React)
- Functional components only — no class components
- Hooks for state: `useState`, `useEffect`; server state via `@tanstack/react-query`
- Pages in `src/pages/`, shared components in `src/components/`, shadcn primitives in `src/components/ui/`
- Use the `@/` path alias (configured in `tsconfig.json` and `vite.config.ts`) for all internal imports
- Styling is **Tailwind utility classes only** — do not write custom CSS files. Use the theme tokens from `src/index.css` (e.g. `bg-primary`, `text-secondary`, `gradient-ember`) instead of hardcoded colors so the Ember palette stays consistent
- Use shadcn/ui components from `@/components/ui/*` (Button, Card, Input, Label, Dialog, etc.) instead of building from scratch
- Authenticated pages should be wrapped in `<ProtectedRoute roles={[...]}>` in `App.tsx` and use `<DashboardLayout title="...">` for the sidebar shell
- Public pages should use `<PublicNav />` at the top
- Auth state via `useAuth()` from `@/api/AuthContext`; data fetching via `apiFetch<T>()` from `@/api/client` (auto-attaches the JWT)

## Frontend rewrite history (Apr 7 2026)

The original plain-CSS frontend was wholesale replaced with the **ember-hope-flow** design system to give the app a polished, donor-facing look. The previous `src/` is preserved at `frontend/src_old_backup/` if anything needs to be recovered.

What changed:
- Tailwind + shadcn/ui added; Inter font, Ember palette (warm orange primary, deep teal secondary, gold accent), gradient utilities
- 12 new pages from ember-hope-flow ported into `src/pages/` (Index, Donate, Login, Dashboard, Donors, Safehouses, Residents, Reports, StaffPortal, DonorPortal, Admin, NotFound), plus `Register.tsx` and `Privacy.tsx` rewritten in the new style
- React downgraded 19 → 18 and react-router 7 → 6 to match shadcn/ui ecosystem expectations
- `AuthProvider` moved inside `BrowserRouter` so `Login` can call `useNavigate` on success
- Only `Login.tsx` and `Register.tsx` are wired to the real backend right now. All staff/admin/donor pages still render mock data and need follow-up work to swap mock data for `apiFetch()` calls against the existing controllers.
- `Dashboard.tsx` (admin/staff landing) and `DonorPortal.tsx` were redesigned on Apr 7 2026 to match new reference mockups. Dashboard now leads with four KPI cards (Active Donors, Total Donations YTD, Monthly Donations, Donor Retention), a Social Media Overview card, Recent Activity feed, and three quick-link cards (Manage Donors, Case Management, View Reports). DonorPortal now leads with a full-width ember-gradient hero banner showing donor name, girls helped, and total contributions, followed by three stat cards (Girls Helped, Total Given, Donations Made), a Donation History table, and an Active Campaigns list with progress bars and Contribute buttons. Both pages use only Tailwind utility classes and the existing Ember theme tokens (`bg-primary-light`, `text-secondary`, `gradient-ember`, etc.) — no new CSS files.
- Same day (Apr 7 2026) both pages were wired to the live Azure SQL backend via `@tanstack/react-query` + `apiFetch()`. Dashboard pulls from the new `GET /api/dashboard/stats` endpoint (active donors, YTD/monthly donation sums with YoY and MoM deltas, rolling 12-month donor retention, and the 6 most recent donations joined to supporter names). DonorPortal pulls from the existing `GET /api/donorportal/me`, `/me/impact`, `/me/donations` endpoints plus the new `GET /api/campaigns` endpoint which aggregates distinct `campaign_name` values from the donations table into raised totals (goals are synthesized as ~1.5× raised, rounded to the nearest $5k, since no campaigns table exists in the schema). The only remaining mock content is the Social Media Overview card, because `social_media_posts` is not yet modeled. "Girls Helped" on DonorPortal is derived client-side from `total_donated / 1500` with a floor of `campaigns_supported.length`. New backend files: `backend/Controllers/DashboardController.cs`, `backend/Controllers/CampaignsController.cs`, and the previously empty `backend/Controllers/SupportersController.cs` was filled in with a standard CRUD pattern (Admin/Staff read/write, Admin-only delete).
- Also Apr 7 2026: the remaining mock-data pages were audited and wired to Azure. `Residents.tsx` now fetches `/api/residents` via react-query, mapping arbitrary `case_status` strings into one of four display stages (Intake / Program / Exit prep / Follow-up) through a `deriveStage()` helper, and colour-codes a risk badge from `current_risk_level`. `Safehouses.tsx` now fetches `/api/safehouses` (new controller — LEFT JOINs residents and returns `activeResidents` alongside `capacityGirls`, `storedOccupancy`, and the full city/province/region/country tuple; full CRUD with Admin-only DELETE). `Admin.tsx` now pulls users from a new `/api/adminusers` endpoint (uses `UserManager<IdentityUser>` to enumerate every Identity account with their roles) and derives its three KPIs from live data: donor retention from `/api/dashboard/stats`, safehouse utilization from `sum(activeResidents)/sum(capacityGirls)` across `/api/safehouses`, and program completion from the share of residents whose `caseStatus` contains "closed"/"reintegrated"/"exited"/"follow". `Index.tsx` (public landing) now pulls from two new `[AllowAnonymous]` endpoints on a new `PublicController` — `/api/public/stats` drives the three hero pills (girls supported, safehouse count, rolling-12-month retention rate matching the admin dashboard) and `/api/public/safehouses` drives the safehouse grid (name, city, region, capacity, active count only — no resident-identifying data). The only pages still on mock data are `Reports.tsx` and `StaffPortal.tsx` (no `reports` or `weekly_logs` tables in the schema yet) and the Social Media Overview card on the admin Dashboard (no `social_media_posts` model yet) — everything else is live Azure SQL. New backend files from this pass: `backend/Controllers/SafehousesController.cs`, `backend/Controllers/AdminUsersController.cs`, `backend/Controllers/PublicController.cs`.
- Also Apr 7 2026: the last two IS 413 required pages — **Process Recording** and **Home Visitation & Case Conferences** — were built end-to-end. Two new controllers `ProcessRecordingsController` and `HomeVisitationsController` provide full CRUD over the existing `process_recordings` and `home_visitations` models (Admin/Staff read+write, Admin-only DELETE; the `notes_restricted` column on process recordings is only returned when the caller is in the Admin role). POST handlers generate the next PK server-side because both tables use non-identity INT primary keys in the canonical schema. Two new frontend pages `ProcessRecording.tsx` and `HomeVisitation.tsx` consume these endpoints via react-query, each with a resident filter, a "new record" modal (shadcn `Dialog`), and a chronological card list. `HomeVisitation.tsx` additionally splits entries into an "Upcoming case conferences & visits" section and a past "Visit history" section based on `visitDate`. Both pages are protected by `ProtectedRoute roles={["Admin","Staff"]}` at `/process-recording` and `/home-visitation`, and the sidebar in `DashboardLayout.tsx` now links to them with `NotebookPen` and `MapPin` icons. Also wired: `RoleSeeder.cs` was extended so that on startup the `donor@ember.org` test account is guaranteed to have a matching `MonetaryDonor` row in `supporters` plus four historical donations totalling $2,350 across four campaigns (idempotent — the seeder skips donation insertion if any already exist for that supporter). Test credentials for admin/staff/donor are documented in `README.md`. All passwords satisfy the hardened password policy (length ≥ 12, upper, lower, digit, non-alphanumeric).
- Also Apr 7 2026: `Donors.tsx` was wired to the real backend. The page was previously a hardcoded array of exactly 8 mock donors. It now fetches `/api/supporters?types=MonetaryDonor,InKindDonor` — per Appendix A of the case doc, only `MonetaryDonor` and `InKindDonor` qualify as "donors" out of the six `supporter_type` values. `SupportersController.GetSupporters` was extended with an optional comma-separated `types` query filter and a LEFT JOIN on the donations table so every row returns `totalDonated`, `donationCount`, and `lastGiftDate` aggregates. The Donors page shows three filter pills (All / Monetary / In-Kind) with counts, a search box, and an "At-risk" toggle. The risk badge (Active / Watch / At risk / Dormant) is derived client-side from days since `lastGiftDate` (<60 / 60–89 / 90+ / never). The admin dashboard's `Active Donors` KPI was re-tuned to the same `MonetaryDonor + InKindDonor` filter so the two pages agree.

---

## Frontend test infrastructure (Apr 7 2026)

Vitest is wired up in `frontend/vite.config.ts` using `jsdom` as the test environment, with `src/test/setup.ts` loaded before each test file (the setup imports `@testing-library/jest-dom` so matchers like `.toBeInTheDocument()` are available globally). `globals: true` is enabled so tests can use `describe`/`it`/`expect` without importing them, though explicit imports also work. The `types` array in `tsconfig.json` lists `vitest/globals` and `@testing-library/jest-dom` so TypeScript picks up the right ambient types.

Run tests with `npm test` (watch mode) or `npm run test:run` (single pass). Only a placeholder `src/test/example.test.ts` exists right now — real component tests still need to be written.

---

## Known dependency advisories (deferred)

`npm audit` reports 5 moderate-severity advisories, all stemming from a single root cause: **GHSA-67mh-4wv8-2f99** in `esbuild <=0.24.2`. The other 4 entries (`vite`, `vite-node`, `@vitest/mocker`, `vitest`) are transitive parents of the same vulnerable `esbuild`.

**Scope:** The vulnerability affects esbuild's development server only. It allows a malicious webpage visited in the same browser as a running Vite dev server to read responses from that server. It does not affect production builds, which are static assets served from Azure.

**Impact on this project:** Development-only; no production exposure. The dev server binds to localhost and is only running during active development on the team's machines.

**Remediation path:** npm's proposed fix (`npm audit fix --force`) upgrades vitest from 2.x to 4.x, a two-major-version brthe real backend. **This is now outdated — see the Apr 8 update below.**

## Backend + auth wiring update (Apr 8 2026)

All major pages are now wired to the real backend via `apiFetch()` and `useQuery`. Mock data has been removed from:
- `Dashboard.tsx` — pulls from `/api/supporters`, `/api/residents`, `/api/safehouses`
- `Donors.tsx` — pulls from `/api/supporters`
- `Safehouses.tsx` — pulls from `/api/safehouses`
- `Residents.tsx` — pulls from `/api/residents`
- `DonorPortal.tsx` — pulls from `/api/donorportal/me`, `/me/donations`, `/me/impact`, `/api/campaigns`

New controllers added: `ProcessRecordingsController`, `HomeVisitationsController`, with pages `ProcessRecording.tsx` and `HomeVisitation.tsx` routed in `App.tsx`.

`CookieConsent.tsx` now properly imported and mounted in `App.tsx`.

## Auth system update (Apr 8 2026) — ApplicationUser + Region/City scope

The Identity system was upgraded from plain `IdentityUser` to a custom `ApplicationUser` class:

- **File:** `backend/Data/ApplicationUser.cs`
- **New columns on `AspNetUsers`:** `Region` (nvarchar(max), nullable), `City` (nvarchar(max), nullable)
- **Migration:** `20260407174017_AddUserRegionCity` (applied manually via SQL + `__EFMigrationsHistory` insert)

### Admin scope logic (no new roles needed)

Admin access level is derived entirely from `Region` and `City` on the user record:

| Region | City | Admin level |
|---|---|---|
| null | null | Company Manager — sees all data |
| set | null | Regional Manager — scoped to their region |
| set | set | Location Manager — scoped to their city |

Staff must have both Region and City set. Donors: Region/City are ignored for access control.

`Region` and `City` are embedded as JWT claims (`"region"`, `"city"`) on login so controllers can filter without a DB round-trip. The `/api/auth/me` endpoint now returns `adminScope` ("company", "region", or "location") for frontend use.

**Note:** Controller-level filtering by region/city is not yet implemented — all Admin users currently see all data. The infrastructure (claims in JWT, scope derivation) is in place.

### Critical rule: always use ApplicationUser, never IdentityUser

Any code that interacts with the Identity system MUST use `ApplicationUser`, not `IdentityUser`. This includes `UserManager<>`, `SignInManager<>`, `FindByEmailAsync`, etc. Using `IdentityUser` directly will break because `Region` and `City` columns won't be included in SELECT queries.

### Test accounts

| Email | Password | Role(s) | Region | City | Admin scope |
|---|---|---|---|---|---|
| admin@ember.org | AdminEmber2026! | Admin, Donor | null | null | Company Manager |
| staff@ember.org | StaffEmber2026! | Staff, Donor | West | Salem | Location-scoped |
| donor@ember.org | DonorEmber2026! | Donor | null | null | N/A |
| admin@intex2026.org | Admin123!@#Pass | Admin | null | null | Company Manager |

### CORS policy

CORS policy was renamed from `"DevCors"` to `"AppCors"` and now reads allowed origins from the `AllowedOrigins` array in `appsettings.json`. Add the production Azure frontend URL to this array before deployment.

```json
"AllowedOrigins": [
  "http://localhost:5173",
  "https://localhost:5173",
  "https://your-frontend.azurestaticapps.net"
]
```

## Current state (as of Apr 8 2026)

### Backend
- ✅ ASP.NET Identity + JWT auth with ApplicationUser (Region/City scope)
- ✅ Two EF Core DbContexts: AppDbContext (EmberApp) + IdentityContext (EmberIdentity)
- ✅ CORS configured via AllowedOrigins config (AppCors policy)
- ✅ HSTS + HTTPS redirect + CSP header middleware
- ✅ Role seeder + auto-migration on startup
- ✅ SupportersController — full CRUD + donation aggregates
- ✅ ResidentsController — full CRUD
- ✅ SafehousesController — full CRUD + live occupancy counts
- ✅ ProcessRecordingsController — GET (with ?residentId filter), DELETE (Admin only), NotesRestricted stripped for non-Admin
- ✅ HomeVisitationsController — full CRUD with ?residentId filter
- ✅ DonorPortalController — /me, /me/donations, /me/impact
- ✅ DashboardController — aggregated KPIs
- ✅ CampaignsController — campaign aggregates from donations
- ✅ AdminUsersController — user list with scope, PUT /scope endpoint
- ✅ PublicController — anonymous stats + safehouse list for landing page
- 🔲 Controller-level region/city filtering for Regional/Location Managers

### Frontend
- ✅ Full routing in App.tsx (public, Admin+Staff, Donor routes with ProtectedRoute)
- ✅ CookieConsent mounted and working
- ✅ Dashboard, Donors, Safehouses, Residents wired to backend
- ✅ DonorPortal wired to backend
- ✅ ProcessRecording + HomeVisitation pages exist and are routed
- ✅ Login + Register wired to backend
- 🔲 Delete confirmation dialogs (required for IS 414)
- 🔲 Dark mode toggle / cookie preference

### Deployment
- 🔲 Azure App Service (backend) — in progress
- 🔲 Azure Static Web Apps (frontend) — not started
- 🔲 Production AllowedOrigins configured
