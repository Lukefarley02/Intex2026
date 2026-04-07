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
│   │   ├── SupportersController.cs  # Full CRUD /api/supporters
│   │   ├── ResidentsController.cs   # Full CRUD /api/residents
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
└── frontend/                        # React + Vite + TypeScript
    ├── package.json
    ├── vite.config.ts               # Dev proxy: /api/* → https://localhost:5001
    ├── tsconfig.json
    ├── index.html
    └── src/
        ├── main.tsx                 # Entry — BrowserRouter → AuthProvider → App
        ├── App.tsx                  # Route definitions + ProtectedRoute wrappers
        ├── index.css                # Global styles
        ├── api/
        │   ├── client.ts           # apiFetch<T>() — typed fetch, auto-attaches JWT, 401 redirect
        │   └── AuthContext.tsx      # React context: login/register/logout/hasRole, token in sessionStorage
        ├── components/
        │   ├── Layout.tsx           # Auth-aware nav: role-based links, email + logout when authenticated
        │   └── ProtectedRoute.tsx   # Route guard: checks isAuthenticated + optional role requirements
        └── pages/
            ├── HomePage.tsx         # Landing page — mission, CTA, impact placeholder
            ├── LoginPage.tsx        # Login form — wired to AuthContext.login(), error/loading states
            ├── RegisterPage.tsx     # Registration form — password confirmation, min 12 char hint
            ├── DashboardPage.tsx    # Admin dashboard — metric cards (placeholder data)
            ├── DonorsPage.tsx       # Supporters table — calls GET /api/supporters
            ├── ResidentsPage.tsx    # Caseload table — calls GET /api/residents
            └── PrivacyPage.tsx      # GDPR privacy policy (static)
```

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
| react, react-dom | UI library |
| react-router-dom | Client-side routing |
| @vitejs/plugin-react | Vite plugin for React fast-refresh |
| typescript | Type checking |

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
- Row counts: supporters (60), donations (420), residents (60), process_recordings (2,819), home_visitations (1,337), social_media_posts (812), and more
