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
│   ├── Program.cs                   # Entry point — Identity, JWT, middleware, auto-migration, role seeder, one-time safehouse occupancy backfill
│   ├── appsettings.json             # Connection string, JWT Issuer/Audience/Expiration
│   ├── appsettings.Development.json # JWT SecretKey + SeedAdmin credentials (dev only)
│   ├── Properties/
│   │   └── launchSettings.json      # Forces ASPNETCORE_ENVIRONMENT=Development
│   ├── Authorization/
│   │   └── UserScope.cs                    # Resolves caller into Founder/RegionalManager/LocationManager/Staff/Donor and exposes IQueryable filters
│   ├── Controllers/
│   │   ├── HealthController.cs             # GET /api/health — smoke test
│   │   ├── AuthController.cs               # POST /api/auth/login|register|logout, GET /api/auth/me — embeds region/city/adminScope in JWT (founder|region|location); also POST /api/auth/change-email, POST /api/auth/change-password, DELETE /api/auth/account (all require current password)
│   │   ├── SupportersController.cs         # CRUD /api/supporters — region-scoped; Staff is auto-restricted to non-monetary types
│   │   ├── ResidentsController.cs          # CRUD /api/residents — scoped through parent safehouse city/region; NotesRestricted admin-only; POST/PUT/DELETE auto-recalculate safehouses.current_occupancy
│   │   ├── SafehousesController.cs         # CRUD /api/safehouses — read scoped; POST/PUT admin-only; DELETE founder-only
│   │   ├── ProcessRecordingsController.cs  # CRUD ?residentId — scoped through resident's safehouse; NotesRestricted admin-only; DELETE founder-only
│   │   ├── HomeVisitationsController.cs    # CRUD ?residentId — scoped through resident's safehouse; DELETE founder-only
│   │   ├── DashboardController.cs          # GET /api/dashboard/stats — KPIs scoped to caller's region; Staff sees zeros (no monetary visibility)
│   │   ├── ReportsController.cs            # GET /api/reports/summary — IS 413 Reports & Analytics: donation trends, resident outcomes, safehouse performance, reintegration rates, Annual Accomplishment Report (caring/healing/teaching); scope-aware; Staff sees empty monetary sections
│   │   ├── CampaignsController.cs          # GET /api/campaigns — aggregates from donations
│   │   ├── AdminUsersController.cs         # GET /api/adminusers (filtered by caller's scope), PUT /api/adminusers/{id}/scope (Founder only)
│   │   ├── PublicController.cs             # /api/public/stats, /safehouses, /donations, /care-story + POST /api/public/donate (anonymous self-service donation intake)
│   │   └── DonorPortalController.cs        # /api/donorportal/me, /me/donations, /me/impact, /me/tax-receipt (Donor only; tax-receipt returns IRS Pub 1771 acknowledgment payload)
│   ├── Data/
│   │   ├── ApplicationUser.cs       # Custom IdentityUser with Region + City properties (determines admin scope)
│   │   ├── AppDbContext.cs          # DbContext for EmberApp DB (6 of 17 tables wired)
│   │   ├── IdentityContext.cs       # IdentityDbContext<ApplicationUser> for EmberIdentity DB
│   │   └── RoleSeeder.cs            # Seeds roles + test users (uses UserManager<ApplicationUser>)
│   ├── Migrations/                  # EF Core migration history
│   │   ├── 20260406233041_InitialCreate.cs          # AppDbContext initial migration
│   │   └── Identity/
│   │       ├── 20260407022212_InitialIdentity.cs    # IdentityContext initial migration
│   │       └── 20260407174017_AddUserRegionCity.cs  # Adds Region + City to AspNetUsers
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
        ├── App.tsx                  # QueryClient → ThemeProvider → Tooltip → BrowserRouter → AuthProvider → Routes (with ProtectedRoute)
        ├── index.css                # Tailwind directives + Ember CSS variable theme (:root light palette + .dark overrides for every theme token) + .gradient-* utilities
        ├── App.css                  # (legacy demo styles, unused)
        ├── vite-env.d.ts
        ├── api/
        │   ├── client.ts            # apiFetch<T>() — typed fetch with dev/prod URL routing (dev: /api proxy → localhost:5001, prod: Azure URL), auto-attaches JWT, 401 redirect
        │   ├── AuthContext.tsx      # React context: login/register/logout/hasRole, token in sessionStorage
        │   └── ThemeContext.tsx     # Light/dark/system theme provider — persists to localStorage (ember-theme), watches prefers-color-scheme live, toggles `dark` class on <html>
        ├── assets/
        │   └── hero-image.jpg       # Landing page hero
        ├── lib/
        │   └── utils.ts             # cn() helper (clsx + tailwind-merge)
        ├── hooks/
        │   ├── useCounterAnimation.ts # Custom hook for animating numbers with easing; used by AnimatedCounter
        │   ├── use-mobile.tsx
        │   └── use-toast.ts
        ├── test/
        │   ├── setup.ts             # Loaded before each test; imports @testing-library/jest-dom + mocks window.matchMedia
        │   └── example.test.ts      # Placeholder smoke test
        ├── components/
        │   ├── ConfirmDialog.tsx    # Reusable shadcn AlertDialog wrapper for IS 414 delete confirmations; accepts optional `children` slot for extra inputs (e.g. delete-account password prompt)
        │   ├── ProtectedRoute.tsx   # Route guard: checks isAuthenticated + optional role requirements
        │   ├── DashboardLayout.tsx  # Sidebar layout for authenticated pages; collapsible NavGroups (Case Management / Fundraising / Analytics / System) tagged by role and filtered via hasRole() — Donor-only sees Donor Portal, Staff sees Dashboard + case-mgmt tools (no Safehouses — embedded on the Staff Dashboard), Admin sees everything. Bottom-left footer is an "Account Settings" link to /account (sign out lives in the top header bar instead)
        │   ├── PublicNav.tsx        # Top nav for public pages (mission/impact/safehouses + Login/Donate)
        │   ├── DonateHeader.tsx     # Minimal header for /donate page (Ember logo only, no navigation)
        │   ├── StatPill.tsx         # Hero stat pill with IntersectionObserver — animates count-up only when visible ("247 girls supported")
        │   ├── AnimatedCounter.tsx  # Animated number display with IntersectionObserver — counts update only when scrolled into view
        │   ├── NavLink.tsx          # Wrapper around react-router NavLink with active/pending classNames
        │   └── ui/                  # shadcn/ui primitives (49 components: button, card, dialog, table, form, etc.)
        └── pages/
            ├── Index.tsx            # Public landing — hero with animated stat pills (IntersectionObserver), features with flip-card animations, safehouses, donation CTA, footer
            ├── Donate.tsx           # Self-service donation form (minimal header with logo only) — POSTs to /api/public/donate; on success shows "create account?" dialog → inline password prompt (14+ chars) → auto-login → /my-impact; anonymous opt-out saves under synthetic supporter
            ├── TaxReceipt.tsx       # Printable IRS Publication 1771 donation acknowledgment letter for donors (year picker, window.print() for Save as PDF); route /tax-receipt, protected for Admin/Staff/Donor
            ├── Login.tsx            # Login form — directs new users to /donate instead of registration, password hint (14+ chars), wired to AuthContext.login()
            ├── Privacy.tsx          # Privacy policy (Ember styled)
            ├── Dashboard.tsx        