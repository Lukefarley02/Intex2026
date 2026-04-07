# Data Dictionary — Schema to Model Mapping

This file maps every table in `lighthouse_schema.sql` to its C# model status. Use this to know what's built, what's stubbed, and what's missing.

Canonical source of truth for column definitions: `lighthouse_schema.sql` (workspace root).
Seed data: `lighthouse_csv_v7/` (workspace root, 17 CSV files).

---

## Status legend

- **Complete** — Model matches schema, controller exists, frontend page exists
- **Stub** — Model exists but is simplified (missing columns from schema)
- **Missing** — No model, no controller, no page yet

---

## Domain 1: Core / Infrastructure

### safehouses (9 rows)
**Status: Stub** — Model exists, missing from controllers

| SQL Column | C# Property | In Model? |
|---|---|---|
| safehouse_id | SafehouseId | Yes |
| safehouse_code | — | No |
| name | Name | Yes |
| region | — | No |
| city | — | No |
| province | — | No |
| country | — | No |
| open_date | — | No |
| status | Status | Yes |
| capacity_girls | Capacity | Partial (renamed, should split girls/staff) |
| capacity_staff | — | No |
| current_occupancy | — | No |
| notes | — | No |

### partners (30 rows)
**Status: Missing**

### partner_assignments (48 rows)
**Status: Missing**

---

## Domain 2: Donor & Support

### supporters (60 rows)
**Status: Stub** — Model + controller exist, simplified

| SQL Column | C# Property | In Model? |
|---|---|---|
| supporter_id | SupporterId | Yes |
| supporter_type | SupporterType | Yes |
| display_name | — | No |
| organization_name | — | No |
| first_name | FirstName | Yes |
| last_name | LastName | Yes |
| relationship_type | — | No |
| region | — | No |
| country | — | No |
| email | Email | Yes |
| phone | Phone | Yes |
| status | — | No |
| created_at | — | No |
| first_donation_date | FirstContactDate | Renamed (should be FirstDonationDate) |
| acquisition_channel | — | No |

### donations (420 rows)
**Status: Stub** — Model exists, no controller

| SQL Column | C# Property | In Model? |
|---|---|---|
| donation_id | DonationId | Yes |
| supporter_id | SupporterId | Yes |
| donation_type | DonationType | Yes |
| donation_date | DonationDate | Yes |
| is_recurring | — | No |
| campaign_name | Campaign | Renamed (should be CampaignName) |
| channel_source | — | No |
| currency_code | — | No |
| amount | Amount | Yes |
| estimated_value | — | No |
| impact_unit | — | No |
| notes | — | No |
| referral_post_id | — | No |

### donation_allocations (521 rows)
**Status: Missing**

### in_kind_donation_items (129 rows)
**Status: Missing**

---

## Domain 3: Case Management

### residents (60 rows)
**Status: Stub** — Model + controller exist, heavily simplified

| SQL Column | C# Property | In Model? |
|---|---|---|
| resident_id | ResidentId | Yes |
| case_control_no | — | No |
| internal_code | — | No |
| safehouse_id | SafehouseId | Yes |
| case_status | Status | Renamed |
| sex | — | No |
| date_of_birth | DateOfBirth | Yes |
| birth_status | — | No |
| place_of_birth | — | No |
| religion | — | No |
| case_category | — | No |
| sub_cat_* (10 flags) | — | No (none of the 10 sub-category booleans) |
| is_pwd | — | No |
| pwd_type | — | No |
| has_special_needs | — | No |
| special_needs_diagnosis | — | No |
| family_* (5 flags) | — | No |
| date_of_admission | AdmissionDate | Yes |
| age_upon_admission | — | No |
| present_age | — | No |
| length_of_stay | — | No |
| referral_source | — | No |
| referring_agency_person | — | No |
| date_colb_registered | — | No |
| date_colb_obtained | — | No |
| assigned_social_worker | — | No |
| initial_case_assessment | — | No |
| date_case_study_prepared | — | No |
| reintegration_type | — | No |
| reintegration_status | — | No |
| initial_risk_level | — | No |
| current_risk_level | RiskLevel | Renamed |
| date_enrolled | — | No |
| date_closed | — | No |
| created_at | — | No |
| notes_restricted | NotesRestricted | Yes (admin-only) |

### process_recordings (2,819 rows)
**Status: Stub** — Model exists, no controller

| SQL Column | C# Property | In Model? |
|---|---|---|
| recording_id | ProcessRecordingId | Renamed |
| resident_id | ResidentId | Yes |
| session_date | SessionDate | Yes |
| social_worker | CreatedBy | Renamed |
| session_type | SessionType | Yes |
| session_duration_minutes | — | No |
| emotional_state_observed | — | No |
| emotional_state_end | — | No |
| session_narrative | Notes | Renamed |
| interventions_applied | — | No |
| follow_up_actions | — | No |
| progress_noted | — | No |
| concerns_flagged | — | No |
| referral_made | — | No |
| notes_restricted | — | No |

### home_visitations (1,337 rows)
**Status: Stub** — Model exists, no controller

| SQL Column | C# Property | In Model? |
|---|---|---|
| visitation_id | HomeVisitationId | Renamed |
| resident_id | ResidentId | Yes |
| visit_date | VisitDate | Yes |
| social_worker | ConductedBy | Renamed |
| visit_type | VisitType | Yes |
| location_visited | — | No |
| family_members_present | — | No |
| purpose | — | No |
| observations | Findings | Renamed |
| family_cooperation_level | — | No |
| safety_concerns_noted | — | No |
| follow_up_needed | — | No |
| follow_up_notes | — | No |
| visit_outcome | — | No |

### education_records (534 rows)
**Status: Missing**

### health_wellbeing_records (534 rows)
**Status: Missing**

### intervention_plans (180 rows)
**Status: Missing**

### incident_reports (100 rows)
**Status: Missing**

---

## Domain 4: Outreach & Communication

### social_media_posts (812 rows)
**Status: Missing**

---

## Domain 5: Reporting & Analytics

### safehouse_monthly_metrics (450 rows)
**Status: Missing**

### public_impact_snapshots (50 rows)
**Status: Missing**

---

## Summary

| Status | Count | Tables |
|---|---|---|
| Stub | 6 | safehouses, supporters, donations, residents, process_recordings, home_visitations |
| Missing | 11 | partners, partner_assignments, donation_allocations, in_kind_donation_items, education_records, health_wellbeing_records, intervention_plans, incident_reports, social_media_posts, safehouse_monthly_metrics, public_impact_snapshots |
| Complete | 0 | — |

**Next priority:** Expand the 6 stubs to match the full schema, then build the 11 missing models starting with the "Must" priority tables from API_REFERENCE.md.
