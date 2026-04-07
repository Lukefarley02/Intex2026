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
| GET | `/api/supporters` | TBD | List all supporters |
| GET | `/api/supporters/{id}` | TBD | Get supporter by ID |
| POST | `/api/supporters` | TBD | Create a new supporter |
| PUT | `/api/supporters/{id}` | TBD | Update a supporter |
| DELETE | `/api/supporters/{id}` | Admin | Delete a supporter |

**GET response shape:**
```json
{
  "supporterId": 1,
  "firstName": "string",
  "lastName": "string",
  "email": "string | null",
  "phone": "string | null",
  "supporterType": "string | null"
}
```

**Note:** The current model is simplified. The full schema includes additional fields: `displayName`, `organizationName`, `relationshipType`, `region`, `country`, `status`, `createdAt`, `firstDonationDate`, `acquisitionChannel`. These will be added when the model is expanded.

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
| Auth | `/api/auth/login`, `/register`, `/logout` | Must | ASP.NET Identity tables |

---

## Auth endpoints (planned — not yet implemented)

These will be created when ASP.NET Identity is wired up:

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create new user account |
| POST | `/api/auth/login` | Authenticate and return token/cookie |
| POST | `/api/auth/logout` | End session |
| GET | `/api/auth/me` | Get current user info + role |

---

## Conventions for new endpoints

- Route: `api/[controller]` (auto from controller name)
- Return `ActionResult<T>` for single items, `ActionResult<IEnumerable<T>>` for lists
- Use `async/await` throughout
- Return `201 CreatedAtAction` for POST, `204 NoContent` for PUT/DELETE
- Return `404 NotFound` when resource doesn't exist
- Add `[Authorize]` attributes per IS 414 security requirements
