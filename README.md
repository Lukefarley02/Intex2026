# Intex 2026

## Test Accounts (Dev)

All accounts are seeded automatically on startup by `backend/Data/RoleSeeder.cs`.
All passwords satisfy the hardened policy (length ≥ 12, upper, lower, digit, non-alphanumeric).

The four-tier access model is derived from each user's Role + `Region` / `City` columns
on `ApplicationUser`. See `API_REFERENCE.md` → "Access tiers" for the full rules.

| Email                  | Password             | Roles          | Region | City  | Tier              | What they see                                                                                                   |
|------------------------|----------------------|----------------|--------|-------|-------------------|-----------------------------------------------------------------------------------------------------------------|
| admin@ember.org        | AdminEmber2026!      | Admin, Donor   | —       | —         | Founder           | Every safehouse, resident, supporter, and donation company-wide. Can create/delete safehouses and change scopes. |
| regional@ember.org     | RegionalEmber2026!   | Admin, Donor   | Visayas | —         | Regional Manager  | All four Visayas safehouses (Cebu City, Iloilo City, Bacolod, Tacloban) and their residents / supporters. Cannot create safehouses or change other users' scope. |
| location@ember.org     | LocationEmber2026!   | Admin, Donor   | Visayas | Cebu City | Location Manager  | The single Cebu City safehouse and its residents / visitations / process recordings. Supporters scoped to `Visayas`. |
| staff@ember.org        | StaffEmber2026!      | Staff, Donor   | Visayas | Cebu City | Staff             | Same Cebu City case data as the Location Manager, but **no monetary or in-kind donors** and `notesRestricted` is stripped. |
| donor@ember.org        | DonorEmber2026!      | Donor          | —       | —         | Donor             | Only their own giving history via `/api/donorportal/me*`. No case-management access at all.                     |
| admin@intex2026.org    | Admin123!@#Pass      | Admin          | —       | —         | Founder           | Legacy seeded founder account.                                                                                  |

### Safehouse region / city reference

| Region   | City            |
|----------|-----------------|
| Luzon    | Quezon City     |
| Luzon    | Baguio City     |
| Visayas  | Cebu City       |
| Visayas  | Iloilo City     |
| Visayas  | Bacolod         |
| Visayas  | Tacloban        |
| Mindanao | Davao City      |
| Mindanao | Cagayan de Oro  |
| Mindanao | General Santos  |
