# API Reference

All endpoints are prefixed with `/api/`. During development, the Vite frontend proxies these automatically to the .NET backend.

Base URL (dev): `https://localhost:5001`
Swagger UI (dev): `https://localhost:5001/swagger`

---

## Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | None | Login and receive a JWT |
| POST | `/api/auth/register` | None | Register a new user |
| POST | `/api/auth/logout` | Any | Stateless — instructs client to discard token |
| GET | `/api/auth/me` | Any | Current user profile with roles and admin scope |

**POST `/api/auth/login` request:**
```json
{ "email": "admin@ember.org", "password": "AdminEmber2026!" }
```

**POST `/api/auth/login` response:**
```json
{
  "token": "eyJhbG...",
  "email": "admin@ember.org",
  "roles": ["Admin", "Donor"],
  "region": null,
  "city": null
}
```
`region` and `city` are `null` for company-level admins and donors. They are populated for regional/location managers and staff.

**POST `/api/auth/register` request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "role": "Staff",
  "region": "West",
  "city": "Salem"
}
```
`role` and `region`/`city` are optional. All users get `Donor` by default; `Staff` or `Admin` can also be assigned.

**GET `/api/auth/me` response:**
```json
{
  "email": "admin@ember.org",
  "roles": ["Admin", "Donor"],
  "region": null,
  "city": null,
  "adminScope": "company"
}
```
`adminScope` is `"founder"`, `"region"`, or `"location"` for Admin users; `null` for Staff and Donor.

### Access tiers

The four-tier access model is derived from the user's role + Region/City columns:

| Tier | Role | Region | City | Sees |
|---|---|---|---|---|
| Founder | Admin | null | null | Every safehouse, resident, supporter, and donation in the system |
| Regional Manager | Admin | set | null | Everything in safehouses whose `region` matches their Region |
| Location Manager | Admin | set | set | Everything in the single safehouse whose `city` matches their City |
| Staff | Staff | set | set | Their city's safehouse + residents + visitations + process recordings, plus non-monetary supporters in their region. Cannot see monetary or in-kind donors. Cannot see resident `notesRestricted`. |
| Donor | Donor | n/a | n/a | Only their own giving history via `/api/donorportal/me*` |

All `Admin,Staff` endpoints in this document silently filter their results by these rules. A request that would touch a row outside the caller's scope returns `403 Forbidden`. Founder-only writes (creating safehouses, deleting any record, changing another user's scope) return `403` for region/location managers.

---

## Admin Users

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/adminusers` | Admin | List Identity users with roles and scope. Regional/Location managers only see users inside their own scope; founders see everyone. |
| PUT | `/api/adminusers/{id}/scope` | Founder | Update a user's region and city. Returns `403` for any admin who is not a founder. |

**GET `/api/adminusers` response:**
```json
[
  {
    "id": "guid",
    "email": "admin@ember.org",
    "emailConfirmed": true,
    "lockedOut": false,
    "roles": ["Admin", "Donor"],
    "region": null,
    "city": null,
    "adminScope": "company"
  }
]
```

**PUT `/api/adminusers/{id}/scope` request:**
```json
{ "region": "West", "city": "Salem" }
```
Pass `null` or empty string to clear a value. Setting `region` only → Regional Manager. Setting both → Location Manager. Clearing both → Founder. Founder-only endpoint.

---

## Health Check

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | None | Returns server status and timestamp |

**Response:**
```json
{ "status": "healthy", "timestamp": "2026-04-06T12:00:00Z" }
```

---

## Supporters

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/supporters?types=MonetaryDonor,InKindDonor` | Admin, Staff | List supporters with aggregated donation totals. Region-scoped. Staff is silently restricted to the four non-monetary `supporter_type` values. |
| GET | `/api/supporters/{id}` | Admin, Staff | Get supporter by ID. `403` if outside scope; `403` for Staff requesting a monetary/in-kind donor. |
| POST | `/api/supporters` | Admin, Staff | Create a new supporter. Must be in caller's region; Staff cannot create monetary/in-kind donors. |
| PUT | `/api/supporters/{id}` | Admin, Staff | Update a supporter. Same scope rules as POST; cannot move a supporter out of the caller's region. |
| DELETE | `/api/supporters/{id}` | Founder | Delete a supporter. |

**Query parameter:** `types` is an optional comma-separated list of `supporter_type` values. Per Appendix A of the case doc the allowed values are `MonetaryDonor`, `InKindDonor`, `Volunteer`, `SkillsContributor`, `SocialMediaAdvocate`, `PartnerOrganization`. When omitted, all supporters are returned.

**GET response shape (list):**
```json
[
  {
    "supporterId": 1,
    "supporterType": "MonetaryDonor",
    "displayName": "Sarah Mitchell",
    "organizationName": null,
    "firstName": "Sarah",
    "lastName": "Mitchell",
    "email": "sarah@example.com",
    "phone": "+1-555-0100",
    "region": "West",
    "country": "US",
    "relationshipType": "International",
    "status": "Active",
    "acquisitionChannel": "Website",
    "createdAt": "2024-01-05T00:00:00Z",
    "firstDonationDate": "2024-01-10T00:00:00Z",
    "totalDonated": 12500.00,
    "donationCount": 5,
    "lastGiftDate": "2026-03-15T00:00:00Z"
  }
]
```
`totalDonated`, `donationCount`, and `lastGiftDate` are computed via a LEFT JOIN on the donations table and will be `0` / `0` / `null` for supporters who have never given. Results are ordered by `totalDonated` descending, then `displayName` ascending.

---

## Residents

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/residents` | Admin, Staff | List residents whose safehouse is in the caller's scope. |
| GET | `/api/residents/{id}` | Admin, Staff | Get resident by ID. Returns the **full `Resident` entity** (all 40+ columns) so the frontend edit form can round-trip every categorical flag on PUT without losing data. `notesRestricted` is stripped for non-Admin callers. The `safehouse` navigation property is nulled out so the payload is flat and can be sent straight back on PUT without EF Core complaining about an attached graph. `403` if the resident's safehouse is outside the caller's scope. |
| POST | `/api/residents` | Admin, Staff | Create a new resident. The target safehouse must be in scope. |
| PUT | `/api/residents/{id}` | Admin, Staff | Update a resident. Both the existing and the target safehouse must be in scope. |
| DELETE | `/api/residents/{id}` | Admin | Delete a resident. Admin tier (any of founder/regional/location) and the resident must be in scope. |

**GET response shape:**
```json
{
  "residentId": 1,
  "safehouseId": 1,
  "firstName": "string",
  "lastName": "string",
  "dateOfBirth": "2010-01-15",
  "admissionDate": "2024-03-01",
  "status": "active | reintegrated | transferred",
  "riskLevel": "low | medium | high | critical",
  "notesRestricted": "string | null (admin-only)",
  "safehouse": { "name": "string" }
}
```

**Security note:** `notesRestricted` is now stripped from every response for Staff callers. Only Admin tiers (founder, regional, location) ever see it.

**Occupancy side effect:** `POST`, `PUT`, and `DELETE` on `/api/residents` all trigger a recalculation of `safehouses.current_occupancy` for the affected safehouse (and both safehouses when a `PUT` moves a resident between houses). The new value equals the live count of residents with `case_status = 'Active'` — `Closed` and `Transferred` residents are not counted. See the note on `GET /api/safehouses` below.

---

## Donor Portal

All three endpoints require a valid JWT token with the `Donor` role. The current user's identity is read from JWT claims — no user ID is accepted as a URL parameter.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/donorportal/me` | Donor | Current donor's supporter profile |
| GET | `/api/donorportal/me/donations` | Donor | Current donor's full donation history |
| GET | `/api/donorportal/me/impact` | Donor | Aggregated giving stats for current donor |

**GET `/api/donorportal/me` response:**
```json
{
  "supporterId": 1,
  "supporterType": "string",
  "displayName": "string",
  "organizationName": "string | null",
  "firstName": "string",
  "lastName": "string",
  "relationshipType": "string",
  "region": "string",
  "country": "string",
  "email": "string",
  "phone": "string | null",
  "status": "string | null",
  "createdAt": "2024-01-01T00:00:00Z | null",
  "firstDonationDate": "2024-01-01T00:00:00Z | null",
  "acquisitionChannel": "string | null"
}
```

**GET `/api/donorportal/me/donations` response:**
```json
[
  {
    "donationId": 1,
    "donationType": "Monetary",
    "donationDate": "2025-12-31T00:00:00Z",
    "amount": 717.18,
    "estimatedValue": 717.18,
    "impactUnit": "pesos",
    "campaignName": "string | null",
    "isRecurring": false,
    "channelSource": "Campaign"
  }
]
```
Returns empty array `[]` if no donations found. Ordered by `donationDate` descending.

**GET `/api/donorportal/me/impact` response:**
```json
{
  "total_donated": 1500.00,
  "total_estimated_value": 1500.00,
  "donation_count": 3,
  "first_donation_date": "2023-07-02T00:00:00Z",
  "most_recent_donation_date": "2025-12-31T00:00:00Z",
  "campaigns_supported": ["Campaign A", "Campaign B"]
}
```
Returns zeros and empty array if no donations found. Never throws 404.

---

## Dashboard (Admin/Staff)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/dashboard/stats` | Admin, Staff | Aggregated KPIs for the admin dashboard. Numbers are filtered to the caller's region (Founder = company-wide). Staff receives all-zero monetary KPIs because Staff is not allowed to see donor or donation totals. |

**GET `/api/dashboard/stats` response:**
```json
{
  "activeDonors": 142,
  "donorsThisMonth": 8,
  "donationsYtd": 187432.50,
  "donationsYtdChangePct": 0.12,
  "donationsThisMonth": 32610.00,
  "donationsMonthChangePct": 0.05,
  "donorRetention": 0.78,
  "recentActivity": [
    {
      "supporterName": "Sarah Mitchell",
      "amount": 500.00,
      "date": "2026-04-05T00:00:00Z",
      "campaign": "Spring Hope Drive"
    }
  ]
}
```
Active donors falls back to total supporter count when the `status` column is not populated. `donationsYtdChangePct` and `donationsMonthChangePct` are `null` when the comparison period had zero donations. Retention is computed as the share of donors who gave between 12–24 months ago who also gave in the last 12 months. Recent activity returns the 6 most recent donations joined to the supporter's display name.

---

## Reports & Analytics (Admin/Staff)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/reports/summary?start=YYYY-MM-DD&end=YYYY-MM-DD` | Admin, Staff | Full Reports page payload: donation trends, resident outcomes, safehouse performance, reintegration rates, Annual Accomplishment Report (caring/healing/teaching). Scope-aware. |

`start` and `end` are optional; default is the trailing 12 months ending today. Numbers are scoped to the caller's region/city, matching the rules in `UserScope`. Staff callers get `staffView: true` and empty `donations` sections so the page still renders without leaking monetary data.

**GET `/api/reports/summary` response (abridged):**
```json
{
  "period": { "start": "2025-04-08T00:00:00Z", "end": "2026-04-08T00:00:00Z" },
  "staffView": false,
  "caring": {
    "residentsServed": 47,
    "activeResidents": 31,
    "totalClosed": 12,
    "caseStatusBreakdown": [{ "status": "Active", "count": 31 }],
    "caseCategoryBreakdown": [{ "category": "Trafficked", "count": 18 }],
    "subCategoryBreakdown": [{ "label": "Trafficked", "count": 18 }]
  },
  "healing": { "counselingSessions": 184, "homeVisits": 42, "riskImproved": 9 },
  "reintegration": {
    "totalClosed": 12,
    "reintegratedSuccess": 9,
    "reintegrationRate": 0.75,
    "reintegrationTypes": [{ "type": "Family", "count": 7 }]
  },
  "safehousePerformance": [
    {
      "safehouseId": 1,
      "name": "Lighthouse Safehouse 1",
      "city": "Quezon City",
      "region": "NCR",
      "capacity": 10,
      "active": 8,
      "closedInWindow": 3,
      "totalServed": 11,
      "utilization": 0.8
    }
  ],
  "donations": {
    "total": 24350,
    "count": 58,
    "trend": [{ "month": "2025-10", "total": 2400, "count": 6 }],
    "byType": [{ "type": "Cash", "total": 18200, "count": 40 }],
    "byCampaign": [{ "campaign": "Spring Hope Drive", "total": 9400, "count": 22 }],
    "bySafehouse": [
      { "safehouseId": 1, "name": "Lighthouse Safehouse 1", "share": 0.33, "allocated": 8035.5 }
    ]
  },
  "annualAccomplishment": {
    "caring":  { "girlsServed": 47, "activeNow": 31, "closedInWindow": 12 },
    "healing": { "counselingSessions": 184, "homeVisits": 42, "riskImproved": 9 },
    "teaching": { "successfulReintegrations": 9, "reintegrationRate": 0.75 }
  }
}
```
Because there is no first-class donation→safehouse link in the schema, `donations.bySafehouse` is computed by weighting each safehouse's share of the period's donation pool by the number of residents it served during the window.

---

## Campaigns

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/campaigns` | Any authenticated | Distinct campaigns aggregated from the donations table |

**GET `/api/campaigns` response:**
```json
[
  {
    "name": "Spring Hope Drive",
    "description": "Supporting our mission through the Spring Hope Drive initiative.",
    "raised": 32400.00,
    "goal": 50000.00,
    "donationCount": 42,
    "endDate": "2026-06-15"
  }
]
```
There is no dedicated campaigns table in the current schema, so this endpoint groups donati
---

## Safehouses

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/safehouses` | Admin, Staff | List safehouses in the caller's scope, with live occupancy counts |
| GET | `/api/safehouses/{id}` | Admin, Staff | Get safehouse by ID; `403` if outside scope |
| POST | `/api/safehouses` | Founder | Create a new safehouse (structural change) |
| PUT | `/api/safehouses/{id}` | Admin | Update a safehouse. Region/City cannot be moved out of caller's scope. |
| DELETE | `/api/safehouses/{id}` | Founder | Delete a safehouse |

**Occupancy note:** Each row in the `GET /api/safehouses` response includes both `storedOccupancy` (the `safehouses.current_occupancy` column) and `activeResidents` (a live `COUNT(*)` over residents with `case_status = 'Active'` joined by `safehouse_id`). These two values are kept in sync automatically — `ResidentsController` recomputes `current_occupancy` after every resident insert, update, or delete, and `Program.cs` runs a one-time backfill on startup to reconcile any drift inherited from the seed CSVs.

---

## Process Recordings

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/processrecordings?residentId=N` | Admin, Staff | List recordings whose resident is in scope. Ordered newest-first. |
| GET | `/api/processrecordings/{id}` | Admin, Staff | Get single recording. `403` if the resident is outside scope. |
| POST | `/api/processrecordings` | Admin, Staff | Create a recording. Resident must be in scope. |
| PUT | `/api/processrecordings/{id}` | Admin, Staff | Update a recording. Both old and new resident must be in scope. |
| DELETE | `/api/processrecordings/{id}` | Founder | Delete a recording. |

**Security note:** `notesRestricted` is stripped from responses for non-Admin callers.

---

## Home Visitations

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/homevisitations?residentId=N` | Admin, Staff | List visitations whose resident is in scope. |
| GET | `/api/homevisitations/{id}` | Admin, Staff | Get single visitation. `403` if the resident is outside scope. |
| POST | `/api/homevisitations` | Admin, Staff | Create a visitation record. Resident must be in scope. |
| PUT | `/api/homevisitations/{id}` | Admin, Staff | Update a visitation. Both old and new resident must be in scope. |
| DELETE | `/api/homevisitations/{id}` | Founder | Delete a visitation record. |
