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
`adminScope` is `"company"`, `"region"`, or `"location"` for Admin users; `null` for Staff and Donor.

---

## Admin Users

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/adminusers` | Admin | List all Identity users with roles and scope |
| PUT | `/api/adminusers/{id}/scope` | Admin | Update a user's region and city |

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
Pass `null` or empty string to clear a value. Setting `region` only → Regional Manager. Setting both → Location Manager. Clearing both → Company Manager.

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
There is no dedicated campaigns table in the current schema, so this endpoint groups donati
---

## Safehouses

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/safehouses` | Admin, Staff | List all safehouses with live occupancy counts |
| GET | `/api/safehouses/{id}` | Admin, Staff | Get safehouse by ID |
| POST | `/api/safehouses` | Admin, Staff | Create a new safehouse |
| PUT | `/api/safehouses/{id}` | Admin, Staff | Update a safehouse |
| DELETE | `/api/safehouses/{id}` | Admin | Delete a safehouse |

---

## Process Recordings

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/processrecordings?residentId=N` | Admin, Staff | List recordings, optionally filtered by resident. Ordered newest-first. |
| GET | `/api/processrecordings/{id}` | Admin, Staff | Get single recording |
| POST | `/api/processrecordings` | Admin, Staff | Create a recording |
| PUT | `/api/processrecordings/{id}` | Admin, Staff | Update a recording |
| DELETE | `/api/processrecordings/{id}` | Admin | Delete a recording |

**Security note:** `notesRestricted` is stripped from responses for non-Admin callers.

---

## Home Visitations

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/homevisitations?residentId=N` | Admin, Staff | List visitations, optionally filtered by resident |
| GET | `/api/homevisitations/{id}` | Admin, Staff | Get single visitation |
| POST | `/api/homevisitations` | Admin, Staff | Create a visitation record |
| PUT | `/api/homevisitations/{id}` | Admin, Staff | Update a visitation record |
| DELETE | `/api/homevisitations/{id}` | Admin | Delete a visitation record |

---

## Social Media Posts

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/social/stats` | Admin, Staff | Aggregated social media KPIs for the dashboard |

**GET `/api/social/stats` response:**
```json
{
  "totalPosts": 850,
  "totalReach": 4200000,
  "avgEngagementRate": 0.1423,
  "totalClickThroughs": 18500,
  "totalDonationReferrals": 342,
  "estimatedDonationValuePhp": 1250000.00,
  "platformBreakdown": [
    { "platform": "Facebook", "postCount": 210, "totalReach": 1200000, "avgEngagementRate": 0.127, "donationReferrals": 95 }
  ],
  "topPostTypes": [
    { "postType": "FundraisingAppeal", "avgDonationValue": 28500.00, "postCount": 140 }
  ]
}
```
Returns all zeroes / empty arrays if the `social_media_posts` table has not yet been seeded.

---

## ML Insights

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/mlinsights` | Admin, Staff | ML-derived KPIs computed live from Azure SQL |

**GET `/api/mlinsights` response:**
```json
{
  "atRiskDonorCount": 12,
  "upgradeOpportunityCount": 8,
  "residentsReadyCount": 5,
  "safehousesNearCapacity": 2,
  "topSocialPlatform": "Facebook",
  "topSocialReferrals": 14
}
```

| Field | Pipeline | Rule Used |
|---|---|---|
| `atRiskDonorCount` | 01 Donor Churn | Monetary donors with last gift > 90 days ago |
| `upgradeOpportunityCount` | 02 Donation Capacity | Recurring donors where `max_donation > 1.5 × avg_donation` |
| `residentsReadyCount` | 04 Resident Outcomes | Active residents with `current_risk_level = 'Low'` |
| `safehousesNearCapacity` | 05 Geographic | Safehouses at ≥ 90% occupancy (live resident count) |
| `topSocialPlatform` | 03 Social Media | Platform with most donation referrals in last 30 days |
