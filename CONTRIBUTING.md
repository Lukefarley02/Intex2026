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
frontend/src/pages/EducationRecordsPage.tsx
```

Follow the pattern in `DonorsPage.tsx`:
1. Define a TypeScript interface matching the API response
2. `useEffect` + `apiFetch<T[]>('/api/educationrecords')` to load data
3. Render a table or card layout
4. Add the route in `App.tsx`
5. Add the nav link in `Layout.tsx`

### Step 5 — Test

1. Run backend: `cd backend && dotnet run`
2. Open Swagger: https://localhost:5001/swagger — verify your endpoints appear
3. Run frontend: `cd frontend && npm run dev`
4. Navigate to your new page and confirm data loads (or shows graceful empty state)

---

## Adding a new page (no new entity)

If you're adding a page that uses existing API endpoints:

1. Create the page component in `frontend/src/pages/`
2. Add the route in `App.tsx`
3. Add nav link in `Layout.tsx` (if it should appear in the header)
4. Use `apiFetch<T>()` from `src/api/client.ts` for data

---

## Git workflow

**Branch naming:** `feature/short-description` (e.g., `feature/education-records`, `feature/cookie-consent`)

**Commit messages:** Start with a verb — `Add education records model and controller`, `Fix CORS config for production`, `Wire up login form to Identity endpoint`

**Before pushing:**
- `cd frontend && npx tsc --noEmit` — TypeScript must compile clean
- `cd frontend && npm run build` — Vite build must succeed
- `cd backend && dotnet build` — Backend must compile
- Never commit `node_modules/`, `bin/`, `obj/`, `dist/`, or `.env`

---

## Files to update when adding a feature

| File | What to add |
|---|---|
| `backend/Models/YourModel.cs` | New entity class |
| `backend/Data/AppDbContext.cs` | DbSet + table mapping |
| `backend/Controllers/YourController.cs` | CRUD endpoints |
| `frontend/src/pages/YourPage.tsx` | New page component |
| `frontend/src/App.tsx` | Route entry |
| `frontend/src/components/Layout.tsx` | Nav link (if visible in header) |
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
