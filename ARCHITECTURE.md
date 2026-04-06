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
│   ├── Program.cs                   # Entry point — services, middleware, pipeline
│   ├── appsettings.json             # Connection string + config
│   ├── appsettings.Development.json
│   ├── Controllers/
│   │   ├── HealthController.cs      # GET /api/health — smoke test
│   │   ├── SupportersController.cs  # Full CRUD /api/supporters
│   │   └── ResidentsController.cs   # Full CRUD /api/residents
│   ├── Data/
│   │   └── AppDbContext.cs          # EF Core context (6 of 17 tables wired)
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
        ├── main.tsx                 # Entry — BrowserRouter wraps App
        ├── App.tsx                  # Route definitions
        ├── index.css                # Global styles
        ├── api/
        │   └── client.ts           # apiFetch<T>() — typed fetch wrapper
        ├── components/
        │   └── Layout.tsx           # Shared header nav + footer (privacy link)
        └── pages/
            ├── HomePage.tsx         # Landing page — mission, CTA, impact placeholder
            ├── LoginPage.tsx        # Login form (not yet wired to Identity)
            ├── DashboardPage.tsx    # Admin dashboard — metric cards (placeholder data)
            ├── DonorsPage.tsx       # Supporters table — calls GET /api/supporters
            ├── ResidentsPage.tsx    # Caseload table — calls GET /api/residents
            └── PrivacyPage.tsx      # GDPR privacy policy (static)
```

---

## NuGet packages (backend)

| Package | Version | Purpose |
|---|---|---|
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

1. Swagger (dev only)
2. HTTPS redirection
3. Content-Security-Policy header (IS 414)
4. CORS — allows http://localhost:5173 (Vite dev server)
5. Authentication / Authorization (Identity not yet wired)
6. Controller mapping

---

## Schema gap — models vs database

The skeleton has 6 simplified models. The full `lighthouse_schema.sql` has 17 tables with many more columns. The following tables still need models + controllers:

| Table | Status |
|---|---|
| safehouses | Model exists (simplified) |
| partners | **Missing** |
| partner_assignments | **Missing** |
| supporters | Model exists (simplified — missing display_name, organization_name, relationship_type, region, country, status, acquisition_channel) |
| donations | Model exists (simplified — missing is_recurring, channel_source, currency_code, estimated_value, impact_unit, referral_post_id) |
| donation_allocations | **Missing** |
| in_kind_donation_items | **Missing** |
| residents | Model exists (simplified — missing ~30 columns from schema) |
| process_recordings | Model exists (simplified — missing session_duration_minutes, emotional states, interventions, follow-up, concerns, referral flags) |
| home_visitations | Model exists (simplified — missing location, family members, cooperation level, safety concerns, outcome) |
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
