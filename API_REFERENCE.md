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

## Conventions for new endpoints

- Route: `api/[controller]` (auto from controller name)
- Return `ActionResult<T>` for single items, `ActionResult<IEnumerable<T>>` for lists
- Use `async/await` throughout
- Return `201 CreatedAtAction` for POST, `204 NoContent` for PUT/DELETE
- Return `404 NotFound` when resource doesn't exist
- Add `[Authorize]` attributes per IS 414 security requirements
