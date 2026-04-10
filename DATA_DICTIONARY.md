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
**Status: Complete** — Model has all columns mapped with `[Column]` attributes, no controller yet

| SQL Column | C# Property | In Model? |
|---|---|---|
| safehouse_id | SafehouseId | Yes |
| safehouse_code | SafehouseCode | Yes |
| name | Name | Yes |
| region | Region | Yes |
| city | City | Yes |
| province | Province | Yes |
| country | Country | Yes |
| open_date | OpenDate | Yes |
| status | Status | Yes |
| capacity_girls | CapacityGirls | Yes |
| capacity_staff | CapacityStaff | Yes |
| current_occupancy | CurrentOccupancy | Yes — auto-synced by `ResidentsController` on every resident insert/update/delete to the live count of `case_status = 'Active'` residents. `Closed` and `Transferred` residents are not counted. Backfilled on app startup from `Program.cs`. |
| notes | Notes | Yes |

### partners (30 rows)
**Status: Missing**

### partner_assignments (48 rows)
**Status: Missing**

---

## Domain 2: Donor & Support

### supporters (60 rows)
**Status: Complete** — Model + controller exist, all columns mapped

| SQL Column | C# Property | In Model? |
|---|---|---|
| supporter_id | SupporterId | Yes |
| supporter_type | SupporterType | Yes |
| display_name | DisplayName | Yes |
| organization_name | OrganizationName | Yes |
| first_name | FirstName | Yes |
| last_name | LastName | Yes |
| relationship_type | RelationshipType | Yes |
| region | Region | Yes |
| country | Country | Yes |
| email | Email | Yes |
| phone | Phone | Yes |
| status | Status | Yes |
| created_at | CreatedAt | Yes |
| first_donation_date | FirstDonationDate | Yes |
| acquisition_channel | AcquisitionChannel | Yes |

### donations (420 rows)
**Status: Complete** — Model exists with all columns, no controller yet

| SQL Column | C# Property | In Model? |
|---|---|---|
| donation_id | DonationId | Yes |
| supporter_id | SupporterId | Yes |
| donation_type | DonationType | Yes |
| donation_date | DonationDate | Yes |
| is_recurring | IsRecurring | Yes |
| campaign_name | CampaignName | Yes |
| channel_source | ChannelSource | Yes |
| currency_code | CurrencyCode | Yes |
| amount | Amount | Yes |
| estimated_value | EstimatedValue | Yes |
| impact_unit | ImpactUnit | Yes |
| notes | Notes | Yes |
| referral_post_id | ReferralPostId | Yes |

### donation_allocations (521 rows)
**Status: Missing**

### in_kind_donation_items (129 rows)
**Status: Missing**

---

## Domain 3: Case Management

### residents (60 rows)
**Status: Complete** — Model + controller exist, all columns mapped, Safehouse navigation property

| SQL Column | C# Property | In Model? |
|---|---|---|
| resident_id | ResidentId | Yes |
| case_control_no | CaseControlNo | Yes |
| internal_code | InternalCode | Yes |
| safehouse_id | SafehouseId | Yes |
| case_status | CaseStatus | Yes |
| sex | Sex | Yes |
| date_of_birth | DateOfBirth | Yes |
| birth_status | BirthStatus | Yes |
| place_of_birth | PlaceOfBirth | Yes |
| religion | Religion | Yes |
| case_category | CaseCategory | Yes |
| sub_cat_physical_abuse | SubCatPhysicalAbuse | Yes |
| sub_cat_sexual_abuse | SubCatSexualAbuse | Yes |
| sub_cat_child_labor | SubCatChildLabor | Yes |
| sub_cat_trafficked | SubCatTrafficked | Yes |
| sub_cat_osaec | SubCatOsaec | Yes |
| sub_cat_cicl | SubCatCicl | Yes |
| sub_cat_orphaned | SubCatOrphaned | Yes |
| sub_cat_street_child | SubCatStreetChild | Yes |
| sub_cat_at_risk | SubCatAtRisk | Yes |
| sub_cat_child_with_hiv | SubCatChildWithHiv | Yes |
| is_pwd | IsPwd | Yes |
| pwd_type | PwdType | Yes |
| has_special_needs | HasSpecialNeeds | Yes |
| special_needs_diagnosis | SpecialNeedsDiagnosis | Yes |
| family_solo_parent | FamilySoloParent | Yes |
| family_indigenous | FamilyIndigenous | Yes |
| family_is_4ps | FamilyIs4ps | Yes |
| family_informal_settler | FamilyInformalSettler | Yes |
| family_parent_pwd | FamilyParentPwd | Yes |
| date_of_admission | DateOfAdmission | Yes |
| age_upon_admission | AgeUponAdmission | Yes |
| present_age | PresentAge | Yes |
| length_of_stay | LengthOfStay | Yes |
| referral_source | ReferralSource | Yes |
| referring_agency_person | ReferringAgencyPerson | Yes |
| date_colb_registered | DateColbRegistered | Yes |
| date_colb_obtained | DateColbObtained | Yes |
| assigned_social_worker | AssignedSocialWorker | Yes |
| initial_case_assessment | InitialCaseAssessment | Yes |
| date_case_study_prepared | DateCaseStudyPrepared | Yes |
| reintegration_type | ReintegrationType | Yes |
| reintegration_status | ReintegrationStatus | Yes |
| initial_risk_level | InitialRiskLevel | Yes |
| current_risk_level | CurrentRiskLevel | Yes |
| date_enrolled | DateEnrolled | Yes |
| date_closed | DateClosed | Yes |
| created_at | CreatedAt | Yes |
| notes_restricted | NotesRestricted | Yes (admin-only) |

### process_recordings (2,819 rows)
**Status: Complete** — Model exists with all columns, no controller yet

| SQL Column | C# Property | In Model? |
|---|---|---|
| recording_id | RecordingId | Yes |
| resident_id | ResidentId | Yes |
| session_date | SessionDate | Yes |
| social_worker | SocialWorker | Yes |
| session_type | SessionType | Yes |
| session_duration_minutes | SessionDurationMinutes | Yes |
| emotional_state_observed | EmotionalStateObserved | Yes |
| emotional_state_end | EmotionalStateEnd | Yes |
| session_narrative | SessionNarrative | Yes |
| interventions_applied | InterventionsApplied | Yes |
| follow_up_actions | FollowUpActions | Yes |
| progress_noted | ProgressNoted | Yes |
| concerns_flagged | ConcernsFlagged | Yes |
| referral_made | ReferralMade | Yes |
| notes_restricted | NotesRestricted | Yes |

### home_visitations (1,337 rows)
**Status: Complete** — Model exists with all columns, no controller yet

| SQL Column | C# Property | In Model? |
|---|---|---|
| visitation_id | VisitationId | Yes |
| resident_id | ResidentId | Yes |
| visit_date | VisitDate | Yes |
| social_worker | SocialWorker | Yes |
| visit_type | VisitType | Yes |
| location_visited | LocationVisited | Yes |
| family_members_present | FamilyMembersPresent | Yes |
| purpose | Purpose | Yes |
| observations | Observations | Yes |
| family_cooperation_level | FamilyCooperationLevel | Yes |
| safety_concerns_noted | SafetyConcernsNoted | Yes |
| follow_up_needed | FollowUpNeeded | Yes |
| follow_up_notes | FollowUpNotes | Yes |
| visit_outcome | VisitOutcome | Yes |

### education_records (534 rows)
**Status: Missing**

### health_wellbeing_records (534 rows)
**Status: Missing**

### intervention_plans (180 rows)
**Status: Complete** — Model + controller exist, all columns mapped

| SQL Column | C# Property | In Model? |
|---|---|---|
| plan_id | PlanId | Yes (PK, non-identity, generated via MaxAsync+1) |
| resident_id | ResidentId | Yes (FK to residents) |
| plan_category | PlanCategory | Yes |
| plan_description | PlanDescription | Yes |
| services_provided | ServicesProvided | Yes |
| target_value | TargetValue | Yes |
| target_date | TargetDate | Yes |
| status | Status | Yes |
| case_conference_date | CaseConferenceDate | Yes |
| created_at | CreatedAt | Yes (default GETUTCDATE()) |
| updated_at | UpdatedAt | Yes (auto-updated on PUT) |
| created_by_user_id | CreatedByUserId | Yes (nullable, Identity user ID; added via startup SQL IF NOT EXISTS) |

### incident_reports (100 rows)
**Status: Missing**

---

## Domain 4: Outreach & Communication

### donor_messages (app-created, no seed CSV)
**Status: Complete** — Model + controller + frontend inbox. Not part of the canonical `lighthouse_schema.sql`; table is created on app startup via raw SQL in `Program.cs`.

| SQL Column | C# Property | In Model? |
|---|---|---|
| message_id | MessageId | Yes (PK, non-identity, generated via MaxAsync+1) |
| supporter_id | SupporterId | Yes (FK to supporters) |
| sender_user_id | SenderUserId | Yes (Identity user ID of admin sender) |
| sender_name | SenderName | Yes (denormalized display name at time of send) |
| template_type | TemplateType | Yes (nullable: "ThankYou" or "Appeal") |
| subject | Subject | Yes |
| body | Body | Yes |
| is_read | IsRead | Yes (default false) |
| created_at | CreatedAt | Yes (default GETUTCDATE()) |
| read_at | ReadAt | Yes (nullable, set on mark-read) |

### password_reset_requests (app-created, no seed CSV)
**Status: Complete** — Model + controller + frontend pages. Not part of the canonical `lighthouse_schema.sql`; table is created on app startup via raw SQL in `Program.cs`.

| SQL Column | C# Property | In Model? |
|---|---|---|
| request_id | RequestId | Yes (PK, non-identity, generated via MaxAsync+1) |
| email | Email | Yes (email of the requesting user) |
| status | Status | Yes ("Pending" → "Resolved") |
| created_at | CreatedAt | Yes (default GETUTCDATE()) |
| resolved_at | ResolvedAt | Yes (nullable) |
| resolved_by_user_id | ResolvedByUserId | Yes (nullable, Identity user ID of resolving admin) |
| temp_password | TempPassword | Yes (nullable; cleared after resolution) |

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
| Complete | 9 | safehouses, supporters, donations, residents, process_recordings, home_visitations, intervention_plans, donor_messages, password_reset_requests |
| Missing | 10 | partners, partner_assignments, donation_allocations, in_kind_donation_items, education_records, health_wellbeing_records, incident_reports, social_media_posts, safehouse_monthly_metrics, public_impact_snapshots |

**Next priority:** Build controllers for the 4 complete models that lack them (donations, safehouses, process_recordings, home_visitations), then build the 11 missing models starting with the "Must" priority tables from API_REFERENCE.md.
