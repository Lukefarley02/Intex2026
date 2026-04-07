# API Reference

All endpoints are prefixed with `/api/`. During development, the Vite frontend proxies these automatically to the .NET backend.

Base URL (dev): `https://localhost:5001`
Swagger UI (dev): `https://localhost:5001/swagger`

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
| GET | `/api/supporters?types=MonetaryDonor,InKindDonor` | Admin, Staff | List supporters with aggregated donation totals |
| GET | `/api/supporters/{id}` | Admin, Staff | Get supporter by ID |
| POST | `/api/supporters` | Admin, Staff | Create a new supporter |
| PUT | `/api/supporters/{id}` | Admin, Staff | Update a supporter |
| DELETE | `/api/supporters/{id}` | Admin | Delete a supporter |

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
| GET | `/api/residents` | TBD | List all residents (includes safehouse) |
| GET | `/api/residents/{id}` | TBD | Get resident by ID (includes safehouse) |
| POST | `/api/residents` | TBD | Create a new resident |
| PUT | `/api/residents/{id}` | TBD | Update a resident |
| DELETE | `/api/residents/{id}` | Admin | Delete a resident |

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

**Security note:** `notesRestricted` must be excluded from responses for non-Admin roles. This is not yet implemented — requires auth + DTO or projection.

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
| GET | `/api/dashboard/stats` | Admin, Staff | Aggregated KPIs for the admin dashboard |

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
There is no dedicated campaigns table in the current schema, so this endpoint groups donations by `campaign_name`, sums `amount` (or `estimated_value` as fallback), and synthesizes a display-only goal (1.5× raised, rounded up to the nearest $5k) and an end date (3 months after the most recent donation to that campaign). Returns the top 10 campaigns by raised amount.

---

## Safehouses

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/safehouses` | Admin, Staff | List all safehouses with live resident counts |
| GET | `/api/safehouses/{id}` | Admin, Staff | Get a single safehouse |
| POST | `/api/safehouses` | Admin, Staff | Create a new safehouse |
| PUT | `/api/safehouses/{id}` | Admin, Staff | Update a safehouse |
| DELETE | `/api/safehouses/{id}` | Admin | Delete a safehouse |

**GET response shape (list):**
```json
[
  {
    "safehouseId": 1,
    "safehouseCode": "SH-001",
    "name": "Casa Esperanza",
    "region": "Central Visayas",
    "province": "Cebu",
    "city": "Cebu City",
    "country": "Philippines",
    "status": "Active",
    "openDate": "2022-01-15",
    "capacityGirls": 12,
    "capacityStaff": 4,
    "storedOccupancy": 9,
    "activeResidents": 9
  }
]
```
`activeResidents` is a LEFT JOIN count of residents whose `case_status` is `Active`/`Open` or whose `date_closed` is null. `storedOccupancy` mirrors the `current_occupancy` column on the safehouses table as a fallback.

---

## Admin Users (Admin only)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/adminusers` | Admin | List every ASP.NET Identity account with role membership |

**Response:**
```json
[
  {
    "id": "b3d0...",
    "email": "admin@ember.org",
    "emailConfirmed": true,
    "lockedOut": false,
    "roles": ["Admin"]
  }
]
```

---

## Public (anonymous) endpoints

These power the marketing landing page. They return aggregated, non-sensitive data only — no resident identifiers are ever exposed.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/public/stats` | None | Headline numbers for the hero pills |
| GET | `/api/public/safehouses` | None | Minimal safehouse list (name, city, capacity, active count) |

**GET `/api/public/stats` response:**
```json
{
  "safehouseCount": 4,
  "girlsSupported": 247,
  "activeGirls": 36,
  "retentionRate": 0.87
}
```

**GET `/api/public/safehouses` response:**
```json
[
  {
    "safehouseId": 1,
    "name": "Casa Esperanza",
    "city": "Cebu City",
    "region": "Central Visayas",
    "capacity": 12,
    "activeResidents": 9
  }
]
```

---

## Endpoints still needed

These controllers do not exist yet. When building them, follow the CRUD pattern in `SupportersController.cs`.

| Resource | Route | Priority | Schema table |
|---|---|---|---|
| Donations (CRUD) | `/api/donations` | Must | donations |
| Donation Allocations | `/api/donationallocations` | Should | donation_allocations |
| In-Kind Items | `/api/inkinditems` | Should | in_kind_donation_items |
| Partners | `/api/partners` | Should | partners |
| Partner Assignments | `/api/partnerassignments` | Could | partner_assignments |
| Process Recordings | `/api/processrecordings` | Must | process_recordings |
| Home Visitations | `/api/homevisitations` | Must | home_visitations |
| Education Records | `/api/educationrecords` | Must | education_records |
| Health Records | `/api/healthrecords` | Must | health_wellbeing_records |
| Intervention Plans | `/api/interventionplans` | Must | intervention_plans |
| Incident Reports | `/api/incidentreports` | Should | incident_reports |
| Social Media Posts | `/api/socialmediaposts` | Must | social_media_posts |
| Monthly Metrics | `/api/monthlymetrics` | Should | safehouse_monthly_metrics |
| Impact Snapshots | `/api/impactsnapshots` | Must | public_impact_snapshots |
| Auth | `/api/auth/login`, `/register`, `/logout` | Must | ASP.NET Identity tables |

---

## Auth

ASP.NET Identity + JWT. Register and Login are `[AllowAnonymous]`; `/me` requires a valid token.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | None | Create new user account, returns JWT |
| POST | `/api/auth/login` | None | Authenticate, returns JWT + email + roles |
| POST | `/api/auth/logout` | None | Stateless — instructs client to discard token |
| GET | `/api/auth/me` | Any role | Returns current user email and roles |

**POST `/api/auth/login` response:**
```json
{
  "token": "eyJhbG...",
  "email": "donor@ember.org",
  "roles": ["Donor"]
}
```

---

## Process Recordings

Counseling session notes per resident. IS 413 requirement.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/processrecordings` | Admin, Staff | List all recordings; supports optional `?residentId=#` filter. Sorted by `sessionDate` desc. `notesRestricted` returned only for Admin. |
| GET | `/api/processrecordings/{id}` | Admin, Staff | Single recording. |
| POST | `/api/processrecordings` | Admin, Staff | Create a new recording (server generates `recordingId`). |
| PUT | `/api/processrecordings/{id}` | Admin, Staff | Update a recording. |
| DELETE | `/api/processrecordings/{id}` | Admin | Delete a recording. |

## Home Visitations

Home visits, field assessments, and case conferences per resident. IS 413 requirement.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/homevisitations` | Admin, Staff | List all visits; supports optional `?residentId=#` filter. Sorted by `visitDate` desc. |
| GET | `/api/homevisitations/{id}` | Admin, Staff | Single visit. |
| POST | `/api/homevisitations` | Admin, Staff | Create a new visit (server generates `visitationId`). |
| PUT | `/api/homevisitations/{id}` | Admin, Staff | Update a visit. |
| DELETE | `/api/homevisitations/{id}` | Admin | Delete a visit. |

---

## Conventions for new endpoints

- Route: `api/[controller]` (auto from controller name)
- Return `ActionResult<T>` for single items, `ActionResult<IEnumerable<T>>` for lists
- Use `async/await` throughout
- Return `201 CreatedAtAction` for POST, `204 NoContent` for PUT/DELETE
- Return `404 NotFound` when resource doesn't exist
- Add `[Authorize]` attributes per IS 414 security requirements
