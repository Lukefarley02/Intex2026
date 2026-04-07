# Intex 2026 — Architecture Reference

Quick-reference for any AI assistant or developer picking up this project.

---

## Project structure

```
Website/Intex2026/
├── Intex2026.sln                    # .NET solution file
├── .gitignore
├── ARCHITECTURE.md                  # This file
│
├── backend/                         # .NET 10 Web API
│   ├── Intex2026.Api.csproj
│   ├── Program.cs                   # Entry point — Identity, JWT, middleware, auto-migration, role seeder
│   ├── appsettings.json             # Connection string, JWT Issuer/Audience/Expiration
│   ├── appsettings.Development.json # JWT SecretKey + SeedAdmin credentials (dev only)
│   ├── Properties/
│   │   └── launchSettings.json      # Forces ASPNETCORE_ENVIRONMENT=Development
│   ├── Controllers/
│   │   ├── HealthController.cs      # GET /api/health — smoke test
│   │   ├── SupportersController.cs  # Full CRUD /api/supporters (Admin/Staff)
│   │   ├── ResidentsController.cs   # Full CRUD /api/residents
│   │   ├── DashboardController.cs   # GET /api/dashboard/stats — admin KPIs (live SQL)
│   │   ├── CampaignsController.cs   # GET /api/campaigns — aggregates from donations
│   │   ├── SafehousesController.cs  # Full CRUD /api/safehouses with live resident counts
│   │   ├── AdminUsersController.cs  # GET /api/adminusers — Identity users + roles (Admin only)
│   │   ├── PublicController.cs      # /api/public/stats + /api/public/safehouses (anonymous landing)
│   │   └── DonorPortalController.cs # Donor-only portal: /api/donorportal/me, /me/donations, /me/impact
│   ├── Data/
│   │   └── AppDbContext.cs          # IdentityDbContext<IdentityUser> (6 of 17 tables wired)
│   ├── Migrations/                  # EF Core migration history
│   │   └── 20260406233041_InitialCreate.cs
│   └── Models/                      # Entity classes
│       ├── Supporter.cs
│       ├── Donation.cs
│       ├── Safehouse.cs
│       ├── Resident.cs
│       ├── ProcessRecording.cs
│       └── HomeVisitation.cs
│
└── frontend/                        # React + Vite + TypeScript + Tailwind + shadcn/ui
    ├── package.json
    ├── vite.config.ts               # Dev proxy: /api/* → https://localhost:5001; "@" alias → src/; vitest test config (jsdom env, setup file)
    ├── tsconfig.json                # paths: { "@/*": ["./src/*"] }; types: node, vite/client, vitest/globals, @testing-library/jest-dom
    ├── tailwind.config.ts           # Ember theme tokens (primary, secondary, gold, sidebar, gradients)
    ├── postcss.config.js            # tailwindcss + autoprefixer
    ├── components.json              # shadcn/ui config (style: default, alias: @/components)
    ├── index.html
    └── src/
        ├── main.tsx                 # Entry — renders <App />, imports index.css
        ├── App.tsx                  # QueryClient → Tooltip → BrowserRouter → AuthProvider → Routes (with ProtectedRoute)
        ├── index.css                # Tailwind directives + Ember CSS variable theme + .gradient-* utilities
        ├── App.css                  # (legacy demo styles, unused)
        ├── vite-env.d.ts
        ├── api/
        │   ├── client.ts            # apiFetch<T>() — typed fetch, auto-attaches JWT, 401 redirect
        │   └── AuthContext.tsx      # React context: login/register/logout/hasRole, token in sessionStorage
        ├── assets/
        │   └── hero-image.jpg       # Landing page hero
        ├── lib/
        │   └── utils.ts             # cn() helper (clsx + tailwind-merge)
        ├── hooks/
        │   ├── use-mobile.tsx
        │   └── use-toast.ts
        ├── test/
        │   ├── setup.ts             # Loaded before each test; imports @testing-library/jest-dom + mocks window.matchMedia
        │   └── example.test.ts      # Placeholder smoke test
        ├── components/
        │   ├── ProtectedRoute.tsx   # Route guard: checks isAuthenticated + optional role requirements
        │   ├── DashboardLayout.tsx  # Sidebar layout for authenticated staff/admin pages (Flame logo, nav, sign out)
        │   ├── PublicNav.tsx        # Top nav for public pages (mission/impact/safehouses + Login/Donate)
        │   ├── StatPill.tsx         # Hero stat pill ("247 girls supported")
        │   ├── NavLink.tsx          # Wrapper around react-router NavLink with active/pending classNames
        │   └── ui/                  # shadcn/ui primitives (49 components: button, card, dialog, table, form, etc.)
        └── pages/
            ├── Index.tsx            # Public landing — hero, features, safehouses, donation CTA, footer
            ├── Donate.tsx           # Public donation form
            ├── Login.tsx            # Login form — wired to AuthContext.login(), Ember branded split layout
            ├── Register.tsx         # Registration form — password confirm, auto-login on success
            ├── Privacy.tsx          # Privacy policy (Ember styled)
            ├── Dashboard.tsx        # Admin/Staff metrics dashboard (mock data — needs wiring)
            ├── Donors.tsx           # Supporters list (mock data — needs wiring to GET /api/supporters)
            ├── Safehouses.tsx       # Safehouses list (mock data — needs models + endpoint)
            ├── Residents.tsx        # Caseload table (mock data — needs wiring to GET /api/residents)
            ├── Reports.tsx          # Impact reports (mock data)
            ├── StaffPortal.tsx      # Staff self-service (mock data)
            ├── DonorPortal.tsx      # Donor "my impact" portal (mock data — needs wiring to /api/donorportal/me)
            ├── Admin.tsx            # User/role admin (mock data)
            └── NotFound.tsx         # 404
```

> **Frontend rewrite — Apr 7 2026.** The original plain-CSS frontend was wholesale replaced with the ember-hope-flow design system (Tailwind + shadcn/ui). Old files preserved at `frontend/src_old_backup/`. The visual look and all 12 ember-hope-flow pages were ported; only `Login.tsx` is wired to the real backend so far. Dashboard, Donors, Residents, etc. still render mock data and need to be wired to the existing API endpoints.

---

## NuGet packages (backend)

| Package | Version | Purpose |
|---|---|---|
| Microsoft.AspNetCore.Authentication.JwtBearer | 10.0.0-* | JWT Bearer token authentication |
| Microsoft.AspNetCore.Identity.EntityFrameworkCore | 10.0.0-* | ASP.NET Identity + EF Core stores |
| Microsoft.EntityFrameworkCore.SqlServer | 10.0.0-* | SQL Server provider for EF Core |
| Microsoft.EntityFrameworkCore.Design | 10.0.0-* | EF Core migrations tooling |
| Swashbuckle.AspNetCore | 7.2.0 | Swagger / OpenAPI (required in .NET 10 — no longer built-in) |

---

## npm packages (frontend)

| Package | Purpose |
|---|---|
| react, react-dom (^18.3) | UI library (downgraded from 19 to match shadcn/ui ecosystem) |
| react-router-dom (^6.30) | Client-side routing |
| @vitejs/plugin-react | Vite plugin for React fast-refresh |
| typescript (~5.7) | Type checking |
| tailwindcss (^3.4), postcss, autoprefixer | Utility-first CSS |
| tailwindcss-animate | Tailwind animation plugin (used by shadcn/ui) |
| tailwind-merge, clsx, class-variance-authority | shadcn/ui className helpers |
| @radix-ui/react-* (~25 packages) | Headless primitives behind shadcn/ui components |
| lucide-react | Icon set used throughout the UI |
| @tanstack/react-query | Server-state cache (provider wired in App.tsx) |
| react-hook-form, @hookform/resolvers, zod | Form state + schema validation |
| sonner, next-themes, cmdk, vaul, embla-carousel-react, recharts, date-fns, react-day-picker, input-otp, react-resizable-panels | Misc shadcn/ui dependencies (toasts, themes, command palette, drawer, carousel, charts, dates, OTP, panels) |
| vitest (^2.1) | Test runner (Vite-native, jest-compatible API) |
| @testing-library/react, @testing-library/user-event, @testing-library/jest-dom | React component testing + DOM matchers |
| jsdom (^25) | Fake DOM environment for vitest |

---

## Running locally

**Backend:**
```bash
cd backend
dotnet restore
dotnet run
# → https://localhost:5001 (check console output for actual port)
# → Swagger: https://localhost:5001/swagger
# → Health: https://localhost:5001/api/health
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
# → /api/* calls proxy to backend automatically

# Production build (used by "Before pushing" checklist):
npm run build         # Runs "tsc --noEmit && vite build"

# Tests:
npm test              # Vitest watch mode
npm run test:run      # Single-pass (CI-style)
```

---

## Key middleware (Program.cs)

**Startup (before middleware):**
- Auto-applies pending EF Core migrations (`db.Database.MigrateAsync()`)
- Seeds Admin/Staff/Donor roles and default admin user
- Wrapped in try-catch — logs errors but lets app continue starting

**Middleware pipeline:**
1. Swagger (dev only)
2. HTTPS redirection
3. Content-Security-Policy header (IS 414)
4. CORS — allows http://localhost:5173 (Vite dev server)
5. Authentication (JWT Bearer — validates tokens on every request)
6. Authorization (RBAC — Admin, Staff, Donor roles enforced via `[Authorize]` attributes)
7. Controller mapping

## Authentication architecture

- **Identity store:** ASP.NET Identity with `IdentityDbContext<IdentityUser>` — Identity tables live alongside business tables in the same database
- **Token type:** JWT (HmacSha256), issued by `AuthController.GenerateJwtToken()`, includes NameIdentifier + Email + Role claims
- **Token lifetime:** Configurable via `Jwt:ExpirationMinutes` in appsettings (default 60 min), ClockSkew = Zero
- **Frontend storage:** `sessionStorage` (cleared on tab close)
- **Password policy:** Min 12 chars, 3 unique, uppercase + lowercase + digit + special required
- **Lockout:** 15 min lockout after 5 failed attempts
- **Auto-migration:** On startup, checks for pending EF Core migrations and applies them automatically; wrapped in try-catch so the app still starts if the DB is unreachable
- **Role seeding:** After migration, creates Admin/Staff/Donor roles + seeds a default admin user from `SeedAdmin` config section
- **Sensitive field filtering:** `notesRestricted` on Residents is nulled out for non-Admin users via anonymous projection in the controller

---

## Schema gap — models vs database

6 of 17 tables have complete models with all columns mapped. The remaining 11 tables still need models + controllers.

| Table | Status |
|---|---|
| safehouses | **Complete** — all columns mapped, `[Column]` attributes, in AppDbContext |
| supporters | **Complete** — all columns mapped, controller exists |
| donations | **Complete** — all columns mapped, no controller yet |
| residents | **Complete** — all 42+ columns mapped, controller exists, Safehouse navigation |
| process_recordings | **Complete** — all columns mapped, no controller yet |
| home_visitations | **Complete** — all columns mapped, no controller yet |
| partners | **Missing** |
| partner_assignments | **Missing** |
| donation_allocations | **Missing** |
| in_kind_donation_items | **Missing** |
| education_records | **Missing** |
| health_wellbeing_records | **Missing** |
| intervention_plans | **Missing** |
| incident_reports | **Missing** |
| social_media_posts | **Missing** |
| safehouse_monthly_metrics | **Missing** |
| public_impact_snapshots | **Missing** |

---

## Data files

- `lighthouse_schema.sql` — full SQL Server DDL for all 17 tables with indexes and FKs
- `lighthouse_csv_v7/` — 17 CSV files matching the schema, ready for seeding
- Row counts: supporters (60), donations (420), residents (60), process_recordings (2,819), home_visitations (1,337), social_media_posts (812), and mo