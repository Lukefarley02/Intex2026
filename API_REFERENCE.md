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
| GET | `/api/supporters` | Admin, Staff | List all supporters |
| GET | `/api/supporters/{id}` | Admin, Staff | Get supporter by ID |
| POST | `/api/supporters` | Admin, Staff | Create a new supporter |
| PUT | `/api/supporters/{id}` | Admin, Staff | Update a supporter |
| DELETE | `/api/supporters/{id}` | Admin | Delete a supporter |

**GET response shape:**
```json
{
  "supporterId": 1,
  "supporterType": "string",
  "displayName": "string",
  "organizationName": "string | null",
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "phone": "string | null",
  "country": "string",
  "region": "string",
  "relationshipType": "string",
  "acquisitionChannel": "string | null",
  "firstDonationDate": "datetime | null",
  "status": "string | null",
  "createdAt": "datetime | null"
}
```

---

## Residents

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/residents` | Admin, Staff | List all residents (includes safehouse) |
| GET | `/api/residents/{id}` | Admin, Staff | Get resident by ID (includes safehouse) |
| POST | `/api/residents` | Admin, Staff | Create a new resident |
| PUT | `/api/residents/{id}` | Admin, Staff | Update a resident |
| DELETE | `/api/residents/{id}` | Admin | Delete a resident |

**GET response shape (anonymous projection — subset of full model):**
```json
{
  "residentId": 1,
  "safehouseId": 1,
  "caseControlNo": "string | null",
  "internalCode": "string | null",
  "caseStatus": "string | null",
  "dateOfBirth": "datetime | null",
  "dateOfAdmission": "datetime | null",
  "currentRiskLevel": "string | null",
  "notesRestricted": "string | null (admin-only)",
  "safehouse": { "name": "string" }
}
```

The full Resident model has 42+ columns (all sub-category flags, family flags, dates, etc.). The controller returns a projected subset; Admin users also receive `notesRestricted`.

**Security note:** `notesRestricted` is stripped from responses for non-Admin roles. This is implemented in `ResidentsController.cs` using anonymous projections that omit the field when the requesting user lacks the Admin role.

---

## Donor Portal

All endpoints require authentication with the Donor role. The current user's identity 
is determined from their JWT token — donors can only ever see their own data.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/donorportal/me` | Donor | Get current donor's supporter profile |
| GET | `/api/donorportal/me/donations` | Donor | Get current donor's full donation history |
| GET | `/api/donorportal/me/impact` | Donor | Get aggregated impact stats for current donor |

**GET /api/donorportal/me response shape:**
```json
{
  "supporterId": 1,
  "displayName": "string",
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "supporterType": "string",
  "status": "string",
  "firstDonationDate": "2024-01-01",
  "acquisitionChannel": "string"
}
```

**GET /api/donorportal/me/donations response shape:**
```json
[
  {
    "donationId": 1,
    "donationType": "string",
    "donationDate": "2024-01-01",
    "amount": 150.00,
    "estimatedValue": 150.00,
    "impactUnit": "pesos",
    "campaignName": "string",
    "isRecurring": true,
    "channelSource": "string"
  }
]
```

**GET /api/donorportal/me/impact response shape:**
```json
{
  "totalDonated": 1800.00,
  "totalEstimatedValue": 1800.00,
  "donationCount": 12,
  "firstDonationDate": "2023-01-15",
  "mostRecentDonationDate": "2024-03-01",
  "campaignsSupported": ["Year-End Hope", "Back to School"]
}
```

---

## Endpoints still needed

These controllers do not exist yet. When building them, follow the CRUD pattern in `SupportersController.cs`.

| Resource | Route | Priority | Schema table |
|---|---|---|---|
| Donations | `/api/donations` | Must | donations |
| Donation Allocations | `/api/donationallocations` | Should | donation_allocations |
| In-Kind Items | `/api/inkinditems` | Should | in_kind_donation_items |
| Safehouses | `/api/safehouses` | Must | safehouses |
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
---

## Authentication (implemented)

ASP.NET Identity + JWT Bearer authentication is fully wired. Tokens are issued on login and must be sent as `Authorization: Bearer <token>` on all protected endpoints. Roles: **Admin**, **Staff**, **Donor**. Default admin is seeded on startup from `appsettings.Development.json`.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | None | Create new user account (assigned Donor role) |
| POST | `/api/auth/login` | None | Authenticate and return JWT |
| POST | `/api/auth/logout` | Authenticated | Stateless — client discards token |
| GET | `/api/auth/me` | Authenticated | Returns email + roles for current user |

**POST /api/auth/register request:**
```json
{ "email": "user@example.com", "password": "SecurePass123!" }
```

**POST /api/auth/login request:**
```json
{ "email": "user@example.com", "password": "SecurePass123!" }
```

**POST /api/auth/login response:**
```json
{ "token": "eyJhbG...", "email": "user@example.com", "roles": ["Donor"] }
```

**GET /api/auth/me response:**
```json
{ "email": "user@example.com", "roles": ["Admin"] }
```

**Password policy (IS 414):** Min 12 chars, 3 unique chars, requires uppercase + lowercase + digit + special. Account locks for 15 min after 5 failed attempts.

---

## Conventions for new endpoints

- Route: `api/[controller]` (auto from controller name)
- Return `ActionResult<T>` for single items, `ActionResult<IEnumerable<T>>` for lists
- Use `async/await` throughout
- Return `201 CreatedAtAction` for POST, `204 NoContent` for PUT/DELETE
- Return `404 NotFound` when resource doesn't exist
- Add `[Authorize]` attributes per IS 414 security requirements
