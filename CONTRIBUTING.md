# Contributing — How to Add Features

This guide walks through the exact steps to add a feature end-to-end. Follow this pattern so everyone's work plugs in cleanly.

---

## Adding a new entity (database table → API → UI)

Use this checklist every time you bring a new table from `lighthouse_schema.sql` into the app.

### Step 1 — Create the Model

Create a new file in `backend/Models/`. Match the schema exactly.

```csharp
// backend/Models/EducationRecord.cs
namespace Intex2026.Api.Models;

public class EducationRecord
{
    public int EducationRecordId { get; set; }      // Maps to education_record_id
    public int ResidentId { get; set; }
    public DateTime RecordDate { get; set; }
    public string EducationLevel { get; set; } = string.Empty;
    // ... add all columns from lighthouse_schema.sql

    // Navigation property
    public Resident? Resident { get; set; }
}
```

**Rules:**
- Use `[Column("snake_case_name")]` attributes on every property to explicitly map to SQL column names
- Use `[Table("table_name")]` on the class to map to the SQL table
- PascalCase C# properties, snake_case SQL columns
- Use `string.Empty` for non-nullable strings, `string?` for nullable
- Add navigation properties for foreign keys (with `[ForeignKey]` attribute)
- One class per file, file name = class name

### Step 2 — Register in AppDbContext

Open `backend/Data/AppDbContext.cs`:

```csharp
public DbSet<EducationRecord> EducationRecords => Set<EducationRecord>();
```

Add table mapping in `OnModelCreating`:

```csharp
modelBuilder.Entity<EducationRecord>().ToTable("education_records");
```

### Step 3 — Create the Controller

Copy an existing controller (e.g., `SupportersController.cs`) and adapt:

```csharp
// backend/Controllers/EducationRecordsController.cs
[ApiController]
[Route("api/[controller]")]
public class EducationRecordsController : ControllerBase
{
    // GET, GET by id, POST, PUT, DELETE — same pattern as SupportersController
}
```

**Security (IS 414) — auth is already wired, just add attributes:**
- Public endpoints (health, landing data): `[AllowAnonymous]`
- Authenticated GET endpoints: `[Authorize]`
- Create/Update: `[Authorize(Roles = "Admin,Staff")]`
- Delete: `[Authorize(Roles = "Admin")]` — and frontend must show confirmation dialog
- If the entity has a `notes_restricted` or `medical_notes_restricted` column, strip it for non-Admin users (see `ResidentsController.cs` for the pattern)

### Step 4 — Create the Frontend Page

```
frontend/src/pages/EducationRecords.tsx
```

Follow the pattern in `Donors.tsx` (an existing mock-data page in `src/pages/` — NOT `src_old_backup/`):
1. Define a TypeScript interface matching the API response
2. Wrap the page in `<DashboardLayout title="Education Records">` for the sidebar shell
3. `useEffect` + `apiFetch<T[]>('/api/educationrecords')` to load data (or use `@tanstack/react-query` if you prefer)
4. Render using shadcn/ui `Table`, `Card`, etc. from `@/components/ui/*`
5. Add the route in `App.tsx`, wrapped in `<ProtectedRoute roles={["Admin","Staff"]}>` as appropriate
6. Add the nav entry in `DashboardLayout.tsx` (sidebar) for authenticated pages, or `PublicNav.tsx` for public pages. **Every sidebar entry must include a `roles: Array<"Admin"|"Staff"|"Donor">` tag** — the sidebar is role-filtered at render time via `hasRole()`. Use `["Admin"]` for admin-only pages, `["Admin","Staff"]` for case-management pages, and `["Donor"]` for the donor portal. Match this tag to the `<ProtectedRoute roles={[...]}>` on the route so the backend guard and the visible nav agree. **For Founder-only pages** (top-level admins with no Region/City scope — e.g. ML Insights) also set `founderOnly: true` on the NavItem and pass the `founderOnly` prop to `<ProtectedRoute>`. On the frontend, use `const { isFounder } = useAuth()` to conditionally render any inline prompt card or link that leads into a Founder-only page.

### Step 5 — Test

1. Run backend: `cd backend && dotnet run`
2. Open Swagger: https://localhost:5001/swagger — verify your endpoints appear
3. Run frontend: `cd frontend && npm run dev`
4. Navigate to your new page and confirm data loads (or shows graceful empty state)

---

## Adding a new page (no new entity)

If you're adding a page that uses existing API endpoints:

1. Create the page component in `frontend/src/pages/` (name like `MyPage.tsx`, no `Page` suffix — matches existing pages)
2. Add the route in `App.tsx`, wrapped in `<ProtectedRoute>` if authenticated
3. Wrap the page body in `<DashboardLayout title="...">` for authenticated pages, or use `<PublicNav />` at the top for public pages
4. Add nav entry in `DashboardLayout.tsx` sidebar (authenticated, with the required `roles` tag — see the previous section) or `PublicNav.tsx` (public)
5. Use `apiFetch<T>()` from `@/api/client` for data (auto-attaches the JWT)

---

## Git workflow

**Branch naming:** `feature/short-description` (e.g., `feature/education-records`, `feature/cookie-consent`)

**Commit messages:** Start with a verb — `Add education records model and controller`, `Fix CORS config for production`, `Wire up login form to Identity endpoint`

**Before pushing:**
- `cd frontend && npm run build` — runs `tsc --noEmit && vite build`; both must succeed
- `cd frontend && npm run test:run` — vitest must pass (once real tests are added)
- `cd backend && dotnet build` — Backend must compile
- Never commit `node_modules/`, `bin/`, `obj/`, `dist/`, `.env`, or `*.tsbuildinfo`

> **Note on the build script:** it's `tsc --noEmit && vite build`, NOT `tsc -b`. `tsc -b` is build mode for composite projects and doesn't fit our flat `tsconfig.json`. Don't change it back.

---

## Files to update when adding a feature

| File | What to add |
|---|---|
| `backend/Models/YourModel.cs` | New entity class |
| `backend/Data/AppDbContext.cs` | DbSet + table mapping |
| `backend/Controllers/YourController.cs` | CRUD endpoints |
| `frontend/src/pages/YourPage.tsx` | New page component |
| `frontend/src/App.tsx` | Route entry (wrap in `<ProtectedRoute>` if needed) |
| `frontend/src/components/DashboardLayout.tsx` | Sidebar nav entry (authenticated pages) — must include a `roles` tag |
| `CLAUDE.md` | Current-state checkbox + dated changelog entry |
| `frontend/src/components/PublicNav.tsx` | Top nav entry (public pages only) |
| `ARCHITECTURE.md` | Update schema gap table |
| `DATA_DICTIONARY.md` | Mark table status as implemented |
| `API_REFERENCE.md` | Document new endpoints |

---

## Common gotchas

1. **Swagger missing?** Make sure `Swashbuckle.AspNetCore` is in the csproj. .NET 10 doesn't include it.
2. **CORS error in browser?** Backend CORS policy only allows `http://localhost:5173`. If your Vite port is different, update `Program.cs`.
3. **API returns 500?** Check the connection string in `appsettings.json`. If the database isn't set up yet, controllers that hit the DB will fail — the Health endpoint (`/api/health`) works without a DB.
4. **TypeScript errors?** Run `npx tsc --noEmit` in the frontend folder to see all errors. Fix before committing.
5. **Navigation property causes circular JSON?** Add `[JsonIgnore]` or use DTOs to avoid serializing navigation loops.
6. **JWT SecretKey not configured?** Ensure `ASPNETCORE_ENVIRONMENT=Development` is set (check `Properties/launchSettings.json`). The secret key lives in `appsettings.Development.json` under `Jwt:SecretKey`.
7. **401 Unauthorized on endpoints that should work?** The JWT token expires (default 60 min). Frontend `apiFetch` auto-clears token and redirects to `/login` on 401. Check that `Authorization: Bearer <token>` header is being sent.
8. **Identity + JWT conflict?** ASP.NET Identity registers cookie schemes internally. Our `Program.cs` explicitly overrides `DefaultScheme`, `DefaultAuthenticateScheme`, and `DefaultChallengeScheme` to `JwtBearerDefaults.AuthenticationScheme`. Do not remove these overrides.
9. **New teammate setup?** After cloning, run `dotnet restore` then `dotnet run` in the backend folder. The app auto-applies pending EF Core migrations on startup, so no manual `dotnet ef database update` is needed. It will create the database tables (both Identity and business) automatically.
10. **Migration/seed errors on startup?** The migration and seeding code in `Program.cs` is wrapped in a try-catch. If the database is unreachable, the error is logged but the app still starts — check the console output for details.
11. **`npm audit` shows 5 moderate vulnerabilities?** Expected. They all trace to `esbuild <=0.24.2` (GHSA-67mh-4wv8-2f99), a dev-server-only flaw. **Do NOT run `npm audit fix --force`** — it upgrades vitest 2 → 4, a breaking change. See the "Known dependency advisories" section in `CLAUDE.md` for the decision record.
12. **`npm run build` fails with `Cannot find module 'vitest'`?** You probably pulled without running `npm install`. The test packages (`vitest`, `@testing-library/*`, `jsdom`) were added on Apr 7 2026 — run `npm install` to pick them up. Alternatively, someone may have put `tsc -b` back in the build script; it should be `tsc --noEmit && vite build`.
13. **Adding a new write path to residents?** `ResidentsController` has a private `RecalculateOccupancyAsync(int safehouseId)` helper that keeps `safehouses.current_occupancy` in sync with the live count of `case_status = 'Active'` residents. It is already wired into `POST`, `PUT`, and `DELETE`. If you add another action that inserts, updates, or removes residents (or changes their `case_status` / `safehouse_id`), call this helper before returning — otherwise the Safehouses page and dashboard KPIs will drift. `PUT`-style moves between houses need to recompute both the old and new safehouse.
