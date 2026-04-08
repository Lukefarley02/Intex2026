# Intex 2026 — Architecture Reference

Quick-reference for any AI assistant or developer picking up this project.

---

## Project structure

```
Website/Intex2026/
├── Intex2026.sln                    # .NET solution file
├── .gitignore
├── ARCHITECTURE.md                  # This file
├── ml-piplines                      # Machine learning python pipelines & .CSV files
│   ├── 01_donor_churn_prediction.ipynb
│   ├── 02_donation_capacity_prediction.ipynb
│   ├── 03_social_media_donation_conversion.ipynb
│   ├── 04_resident_outcome_prediction.ipynb
│   ├── 05_geographic_safehouse_performance.ipynb
│   ├── 06_acquisition_channel_roi.ipynb
│   ├── 07_partner_effectiveness.ipynb
│   ├── 08_in_kind_needs_forecasting.ipynb
│   ├── donation_allocations.csv
│   ├── donations.csv
│   ├── education_records.csv
│   ├── health_wellbeing_records.csv
│   ├── home_visitations.csv
│   ├── in_kind_donation_items.csv
│   ├── incident_reports.csv
│   ├── intervention_plans.csv
│   ├── partner_assignments.csv
│   ├── partners.csv
│   ├── process_recordings.csv
│   ├── public_impact_snapshots.csv
│   ├── residents.csv
│   ├── safehouse_monthly_metrics.csv
│   ├── safehouses.csv
│   ├── social_media_posts.csv
│   └── supporters.csv
│
├── backend/                         # .NET 10 Web API
│   ├── Intex2026.Api.csproj
│   ├── Program.cs                   # Entry point — Identity, JWT, middleware, auto-migration, role seeder
│   ├── appsettings.json             # Connection string, JWT Issuer/Audience/Expiration
│   ├── appsettings.Development.json # JWT SecretKey + SeedAdmin credentials (dev only)
│   ├── Properties/
│   │   └── launchSettings.json      # Forces ASPNETCORE_ENVIRONMENT=Development
│   ├── Controllers/
│   │   ├── HealthController.cs             # GET /api/health — smoke test
│   │   ├── AuthController.cs               # POST /api/auth/login|register|logout, GET /api/auth/me — embeds region/city/adminScope in JWT
│   │   ├── SupportersController.cs         # Full CRUD /api/supporters (Admin/Staff) + donation aggregates
│   │   ├── ResidentsController.cs          # Full CRUD /api/residents (Admin/Staff)
│   │   ├── SafehousesController.cs         # Full CRUD /api/safehouses with live resident counts (Admin/Staff)
│   │   ├── ProcessRecordingsController.cs  # GET ?residentId, DELETE /api/processrecordings — NotesRestricted stripped for non-Admin
│   │   ├── HomeVisitationsController.cs    # Full CRUD /api/homevisitations, GET ?residentId filter
│   │   ├── DashboardController.cs          # GET /api/dashboard/stats — admin KPIs (live SQL)
│   │   ├── CampaignsController.cs          # GET /api/campaigns — aggregates from donations
│   │   ├── AdminUsersController.cs         # GET /api/adminusers (users+roles+scope), PUT /api/adminusers/{id}/scope (Admin only)
│   │   ├── PublicController.cs             # /api/public/stats + /api/public/safehouses (anonymous)
│   │   ├── DonorPortalController.cs        # /api/donorportal/me, /me/donations, /me/impact (Donor only)
│   │   ├── SocialMediaPostsController.cs   # GET /api/social/stats — social media KPIs (Admin/Staff)
│   │   └── MLInsightsController.cs         # GET /api/mlinsights (dashboard summary) + /donor-churn /donation-capacity /resident-outcomes /geographic /acquisition-roi (Admin/Staff)
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
│       ├── HomeVisitation.cs
│       └── SocialMediaPost.cs             # Partial model (dashboard-relevant columns only)
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
            ├── Dashboard.tsx
            ├── MLInsights.tsx       # /ml-insights — 8-pipeline tab view with recharts, KPIs, interpretations, actions