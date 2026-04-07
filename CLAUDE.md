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