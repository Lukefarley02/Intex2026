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

## Tech stack (locked — do not suggest alternatives)

| Layer | Technology |
|---|---|
| Backend | .NET 10 / C# / EF Core |
| Frontend | React 19 + TypeScript + Vite 6 |
| Routing | react-router-dom v7 |
| Database | SQL Server (Azure SQL for production) |
| Auth | ASP.NET Identity + JWT Bearer (fully implemented & audited) |
| Swagger | Swashbuckle.AspNetCore 7.2.0 |
| Deployment | Microsoft Azure |
| ML | Python / Jupyter notebooks (separate ml-pipelines/ folder) |

## Coding conventions

### Backend (C#)
- Namespace: `Intex2026.Api.*` (e.g., `Intex2026.Api.Models`, `Intex2026.Api.Controllers`)
- Models: PascalCase properties, one class per file, file name matches class name
- Table mapping: `modelBuilder.Entity<X>().ToTable("snake_case_table_name")` in AppDbContext
- Controllers: RESTful, `[ApiController]` attribute, route pattern `api/[controller]`
- All async — use `async Task<ActionResult<T>>` pattern

### Frontend (TypeScript/React)
- Functional components only — no class components
- Hooks for state: `useState`, `useEffect`
- Pages in `src/pages/`, shared components in `src/components/`
- API calls go through `src/api/client.ts` using `apiFetch<T>()`
- File naming: PascalCase for components (e.g., `DonorsPage.tsx`)

## How to run locally

```bash
# Terminal 1 — Backend
cd backend && dotnet restore && dotnet run

# Terminal 2 — Frontend
cd frontend && npm install && npm run dev
```

Backend: https://localhost:5001 | Swagger: https://localhost:5001/swagger
Frontend: http://localhost:5173 (proxies /api/* to backend)

## Auth status (as of Apr 6 2026)

Authentication is **fully implemented and audited**. Do not rebuild or rewire auth. Key facts:

- ASP.NET Identity + JWT Bearer tokens (HmacSha256)
- 3 roles seeded on startup: Admin, Staff, Donor
- Default admin seeded from `appsettings.Development.json` → `SeedAdmin` section
- Password policy: min 12 chars, 3 unique, all complexity flags, lockout after 5 failures
- Frontend stores JWT in `sessionStorage`, attaches via `apiFetch()` in `src/api/client.ts`
- `AuthContext.tsx` provides `login()`, `register()`, `logout()`, `hasRole()` to all components
- `ProtectedRoute.tsx` guards routes by authentication + optional role check
- `notesRestricted` field is stripped for non-Admin users in ResidentsController
- Identity tables coexist with business tables in the same database (managed by EF Core migrations)
- **Critical:** `Program.cs` explicitly sets all three default auth schemes to `JwtBearerDefaults.AuthenticationScheme` to override Identity's cookie defaults. Do not remove this.

## Common tasks

### Add a new database table/model
See CONTRIBUTING.md and DATA_DICTIONARY.md. Pattern: create Model → register in AppDbContext → add migration → add Controller → add frontend page.

### Add a new page
1. Create `frontend/src/pages/NewPage.tsx`
2. Add route in `frontend/src/App.tsx` (wrap in `<ProtectedRoute>` if auth required)
3. Add nav link in `frontend/src/components/Layout.tsx` (conditionally shown based on role)

### Add a new API endpoint
1. Create or edit controller in `backend/Controllers/`
2. Follow existing CRUD pattern (see SupportersController.cs as reference)
3. Add `[Authorize(Roles = "Admin,Staff")]` or `[Authorize(Roles = "Admin")]` as appropriate (IS 414)
4. For restricted fields, use the anonymous projection pattern from ResidentsController
