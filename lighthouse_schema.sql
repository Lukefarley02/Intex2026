-- ============================================================
-- Lighthouse Sanctuary Database Schema
-- Generated from lighthouse_csv_v7 dataset (17 tables)
-- Syntax: SQL Server (Azure SQL compatible)
-- Compatible with: PostgreSQL / MySQL with minor type swaps
-- ============================================================

-- ============================================================
-- DOMAIN 1: CORE / INFRASTRUCTURE
-- ============================================================

CREATE TABLE safehouses (
    safehouse_id        INT             PRIMARY KEY,
    safehouse_code      NVARCHAR(20)    NOT NULL UNIQUE,
    name                NVARCHAR(150)   NOT NULL,
    region              NVARCHAR(100)   NOT NULL,
    city                NVARCHAR(100)   NOT NULL,
    province            NVARCHAR(100)   NOT NULL,
    country             NVARCHAR(100)   NOT NULL,
    open_date           DATE            NOT NULL,
    status              NVARCHAR(20)    NOT NULL DEFAULT 'Active',   -- Active, Inactive, Closed
    capacity_girls      INT             NOT NULL,
    capacity_staff      INT             NOT NULL,
    current_occupancy   INT             NOT NULL DEFAULT 0,
    notes               NVARCHAR(MAX)   NULL
);

CREATE TABLE partners (
    partner_id          INT             PRIMARY KEY,
    partner_name        NVARCHAR(200)   NOT NULL,
    partner_type        NVARCHAR(50)    NOT NULL,       -- Organization, Individual
    role_type           NVARCHAR(50)    NOT NULL,       -- SafehouseOps, Evaluation, Education, Logistics
    contact_name        NVARCHAR(150)   NOT NULL,
    email               NVARCHAR(254)   NOT NULL,
    phone               NVARCHAR(30)    NULL,
    region              NVARCHAR(100)   NOT NULL,
    status              NVARCHAR(20)    NOT NULL DEFAULT 'Active',
    start_date          DATE            NOT NULL,
    end_date            DATE            NULL,
    notes               NVARCHAR(MAX)   NULL
);

CREATE TABLE partner_assignments (
    assignment_id       INT             PRIMARY KEY,
    partner_id          INT             NOT NULL,
    safehouse_id        INT             NOT NULL,
    program_area        NVARCHAR(50)    NOT NULL,       -- Operations, Wellbeing, Education, Logistics
    assignment_start    DATE            NOT NULL,
    assignment_end      DATE            NULL,
    responsibility_notes NVARCHAR(MAX)  NULL,
    is_primary          BIT             NOT NULL DEFAULT 0,
    status              NVARCHAR(20)    NOT NULL DEFAULT 'Active',

    CONSTRAINT FK_partner_assignments_partner
        FOREIGN KEY (partner_id) REFERENCES partners(partner_id),
    CONSTRAINT FK_partner_assignments_safehouse
        FOREIGN KEY (safehouse_id) REFERENCES safehouses(safehouse_id)
);

CREATE INDEX IX_partner_assignments_partner  ON partner_assignments(partner_id);
CREATE INDEX IX_partner_assignments_safehouse ON partner_assignments(safehouse_id);


-- ============================================================
-- DOMAIN 2: DONOR & SUPPORT
-- ============================================================

CREATE TABLE supporters (
    supporter_id        INT             PRIMARY KEY,
    supporter_type      NVARCHAR(50)    NOT NULL,       -- SocialMediaAdvocate, Volunteer, MonetaryDonor
    display_name        NVARCHAR(150)   NOT NULL,
    organization_name   NVARCHAR(200)   NULL,
    first_name          NVARCHAR(100)   NOT NULL,
    last_name           NVARCHAR(100)   NOT NULL,
    relationship_type   NVARCHAR(50)    NOT NULL,       -- Local, PartnerOrganization
    region              NVARCHAR(100)   NOT NULL,
    country             NVARCHAR(100)   NOT NULL,
    email               NVARCHAR(254)   NOT NULL,
    phone               NVARCHAR(30)    NULL,
    status              NVARCHAR(20)    NOT NULL DEFAULT 'Active',
    created_at          DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
    first_donation_date DATE            NULL,
    acquisition_channel NVARCHAR(50)    NULL            -- SocialMedia, Church, Event, etc.
);

CREATE INDEX IX_supporters_status ON supporters(status);
CREATE INDEX IX_supporters_type   ON supporters(supporter_type);

CREATE TABLE donations (
    donation_id         INT             PRIMARY KEY,
    supporter_id        INT             NOT NULL,
    donation_type       NVARCHAR(30)    NOT NULL,       -- Monetary, Time, InKind
    donation_date       DATE            NOT NULL,
    is_recurring        BIT             NOT NULL DEFAULT 0,
    campaign_name       NVARCHAR(200)   NULL,
    channel_source      NVARCHAR(50)    NULL,           -- Campaign, Event, PartnerReferral, Direct
    currency_code       NVARCHAR(10)    NULL,           -- PHP, USD, etc.
    amount              DECIMAL(12,2)   NULL,           -- NULL for non-monetary
    estimated_value     DECIMAL(12,2)   NOT NULL DEFAULT 0,
    impact_unit         NVARCHAR(30)    NULL,           -- pesos, hours, items
    notes               NVARCHAR(MAX)   NULL,
    referral_post_id    INT             NULL,           -- FK to social_media_posts

    CONSTRAINT FK_donations_supporter
        FOREIGN KEY (supporter_id) REFERENCES supporters(supporter_id),
    -- FK to social_media_posts added after that table is created
);

CREATE INDEX IX_donations_supporter    ON donations(supporter_id);
CREATE INDEX IX_donations_date         ON donations(donation_date);
CREATE INDEX IX_donations_campaign     ON donations(campaign_name) WHERE campaign_name IS NOT NULL;
CREATE INDEX IX_donations_referral     ON donations(referral_post_id) WHERE referral_post_id IS NOT NULL;

CREATE TABLE donation_allocations (
    allocation_id       INT             PRIMARY KEY,
    donation_id         INT             NOT NULL,
    safehouse_id        INT             NOT NULL,
    program_area        NVARCHAR(50)    NOT NULL,       -- Education, Transport, Wellbeing, Operations
    amount_allocated    DECIMAL(12,2)   NOT NULL,
    allocation_date     DATE            NOT NULL,
    allocation_notes    NVARCHAR(MAX)   NULL,

    CONSTRAINT FK_donation_allocations_donation
        FOREIGN KEY (donation_id) REFERENCES donations(donation_id),
    CONSTRAINT FK_donation_allocations_safehouse
        FOREIGN KEY (safehouse_id) REFERENCES safehouses(safehouse_id)
);

CREATE INDEX IX_donation_allocations_donation  ON donation_allocations(donation_id);
CREATE INDEX IX_donation_allocations_safehouse ON donation_allocations(safehouse_id);

CREATE TABLE in_kind_donation_items (
    item_id             INT             PRIMARY KEY,
    donation_id         INT             NOT NULL,
    item_name           NVARCHAR(200)   NOT NULL,
    item_category       NVARCHAR(50)    NOT NULL,       -- SchoolMaterials, Food, Supplies, Medical
    quantity            INT             NOT NULL,
    unit_of_measure     NVARCHAR(30)    NOT NULL,       -- sets, packs, pieces, kg
    estimated_unit_value DECIMAL(10,2)  NOT NULL DEFAULT 0,
    intended_use        NVARCHAR(50)    NULL,           -- Health, Shelter, Hygiene, Education
    received_condition  NVARCHAR(20)    NOT NULL DEFAULT 'Good',  -- New, Good, Fair

    CONSTRAINT FK_in_kind_items_donation
        FOREIGN KEY (donation_id) REFERENCES donations(donation_id)
);

CREATE INDEX IX_in_kind_items_donation ON in_kind_donation_items(donation_id);


-- ============================================================
-- DOMAIN 3: CASE MANAGEMENT
-- ============================================================

CREATE TABLE residents (
    resident_id              INT             PRIMARY KEY,
    case_control_no          NVARCHAR(20)    NOT NULL UNIQUE,
    internal_code            NVARCHAR(20)    NOT NULL UNIQUE,
    safehouse_id             INT             NOT NULL,
    case_status              NVARCHAR(20)    NOT NULL DEFAULT 'Active',   -- Active, Closed

    -- Demographics
    sex                      NVARCHAR(10)    NOT NULL DEFAULT 'F',
    date_of_birth            DATE            NOT NULL,
    birth_status             NVARCHAR(30)    NULL,           -- Marital, Non-Marital
    place_of_birth           NVARCHAR(200)   NULL,
    religion                 NVARCHAR(100)   NULL,

    -- Case categorization
    case_category            NVARCHAR(50)    NOT NULL,       -- Neglected, Surrendered, Abandoned, etc.
    sub_cat_orphaned         BIT             NOT NULL DEFAULT 0,
    sub_cat_trafficked       BIT             NOT NULL DEFAULT 0,
    sub_cat_child_labor      BIT             NOT NULL DEFAULT 0,
    sub_cat_physical_abuse   BIT             NOT NULL DEFAULT 0,
    sub_cat_sexual_abuse     BIT             NOT NULL DEFAULT 0,
    sub_cat_osaec            BIT             NOT NULL DEFAULT 0,
    sub_cat_cicl             BIT             NOT NULL DEFAULT 0,
    sub_cat_at_risk          BIT             NOT NULL DEFAULT 0,
    sub_cat_street_child     BIT             NOT NULL DEFAULT 0,
    sub_cat_child_with_hiv   BIT             NOT NULL DEFAULT 0,

    -- Disability / special needs
    is_pwd                   BIT             NOT NULL DEFAULT 0,
    pwd_type                 NVARCHAR(100)   NULL,
    has_special_needs        BIT             NOT NULL DEFAULT 0,
    special_needs_diagnosis  NVARCHAR(200)   NULL,

    -- Family background
    family_is_4ps            BIT             NOT NULL DEFAULT 0,
    family_solo_parent       BIT             NOT NULL DEFAULT 0,
    family_indigenous        BIT             NOT NULL DEFAULT 0,
    family_parent_pwd        BIT             NOT NULL DEFAULT 0,
    family_informal_settler  BIT             NOT NULL DEFAULT 0,

    -- Admission & timeline
    date_of_admission        DATE            NOT NULL,
    age_upon_admission       NVARCHAR(50)    NULL,
    present_age              NVARCHAR(50)    NULL,
    length_of_stay           NVARCHAR(50)    NULL,
    referral_source          NVARCHAR(100)   NULL,
    referring_agency_person  NVARCHAR(150)   NULL,
    date_colb_registered     DATE            NULL,
    date_colb_obtained       DATE            NULL,

    -- Assignment & assessment
    assigned_social_worker   NVARCHAR(20)    NULL,           -- e.g. SW-01, SW-15
    initial_case_assessment  NVARCHAR(MAX)   NULL,
    date_case_study_prepared DATE            NULL,

    -- Reintegration
    reintegration_type       NVARCHAR(50)    NULL,           -- Foster Care, Family Reunification, Independent Living
    reintegration_status     NVARCHAR(30)    NULL,           -- In Progress, Completed, Not Started
    initial_risk_level       NVARCHAR(20)    NULL,           -- Critical, High, Medium, Low
    current_risk_level       NVARCHAR(20)    NULL,           -- Critical, High, Medium, Low

    -- Lifecycle dates
    date_enrolled            DATE            NULL,
    date_closed              DATE            NULL,
    created_at               DATETIME2       NOT NULL DEFAULT GETUTCDATE(),

    -- Restricted (admin-only)
    notes_restricted         NVARCHAR(MAX)   NULL,

    CONSTRAINT FK_residents_safehouse
        FOREIGN KEY (safehouse_id) REFERENCES safehouses(safehouse_id)
);

CREATE INDEX IX_residents_safehouse     ON residents(safehouse_id);
CREATE INDEX IX_residents_status        ON residents(case_status);
CREATE INDEX IX_residents_risk          ON residents(current_risk_level);
CREATE INDEX IX_residents_social_worker ON residents(assigned_social_worker);

CREATE TABLE process_recordings (
    recording_id             INT             PRIMARY KEY,
    resident_id              INT             NOT NULL,
    session_date             DATE            NOT NULL,
    social_worker            NVARCHAR(20)    NOT NULL,       -- e.g. SW-02
    session_type             NVARCHAR(30)    NOT NULL,       -- Individual, Group
    session_duration_minutes INT             NOT NULL,
    emotional_state_observed NVARCHAR(50)    NULL,           -- Angry, Distressed, Anxious, Hopeful, etc.
    emotional_state_end      NVARCHAR(50)    NULL,
    session_narrative        NVARCHAR(MAX)   NULL,
    interventions_applied    NVARCHAR(MAX)   NULL,
    follow_up_actions        NVARCHAR(MAX)   NULL,
    progress_noted           BIT             NOT NULL DEFAULT 0,
    concerns_flagged         BIT             NOT NULL DEFAULT 0,
    referral_made            BIT             NOT NULL DEFAULT 0,
    notes_restricted         NVARCHAR(MAX)   NULL,

    CONSTRAINT FK_process_recordings_resident
        FOREIGN KEY (resident_id) REFERENCES residents(resident_id)
);

CREATE INDEX IX_process_recordings_resident ON process_recordings(resident_id);
CREATE INDEX IX_process_recordings_date     ON process_recordings(session_date);
CREATE INDEX IX_process_recordings_worker   ON process_recordings(social_worker);

CREATE TABLE home_visitations (
    visitation_id            INT             PRIMARY KEY,
    resident_id              INT             NOT NULL,
    visit_date               DATE            NOT NULL,
    social_worker            NVARCHAR(20)    NOT NULL,
    visit_type               NVARCHAR(60)    NOT NULL,       -- Routine Follow-Up, Post-Placement Monitoring, etc.
    location_visited         NVARCHAR(200)   NULL,
    family_members_present   NVARCHAR(MAX)   NULL,
    purpose                  NVARCHAR(MAX)   NULL,
    observations             NVARCHAR(MAX)   NULL,
    family_cooperation_level NVARCHAR(30)    NULL,           -- Cooperative, Neutral, Uncooperative
    safety_concerns_noted    BIT             NOT NULL DEFAULT 0,
    follow_up_needed         BIT             NOT NULL DEFAULT 0,
    follow_up_notes          NVARCHAR(MAX)   NULL,
    visit_outcome            NVARCHAR(30)    NULL,           -- Favorable, Unfavorable, Needs Improvement

    CONSTRAINT FK_home_visitations_resident
        FOREIGN KEY (resident_id) REFERENCES residents(resident_id)
);

CREATE INDEX IX_home_visitations_resident ON home_visitations(resident_id);
CREATE INDEX IX_home_visitations_date     ON home_visitations(visit_date);
CREATE INDEX IX_home_visitations_worker   ON home_visitations(social_worker);

CREATE TABLE education_records (
    education_record_id      INT             PRIMARY KEY,
    resident_id              INT             NOT NULL,
    record_date              DATE            NOT NULL,
    education_level          NVARCHAR(30)    NOT NULL,       -- Primary, Secondary, Vocational
    school_name              NVARCHAR(200)   NULL,
    enrollment_status        NVARCHAR(30)    NOT NULL,       -- Enrolled, Dropped, Graduated
    attendance_rate          DECIMAL(5,4)    NULL,           -- 0.0000 to 1.0000
    progress_percent         DECIMAL(5,2)    NULL,           -- 0.00 to 100.00
    completion_status        NVARCHAR(30)    NULL,           -- NotStarted, InProgress, Completed
    notes                    NVARCHAR(MAX)   NULL,

    CONSTRAINT FK_education_records_resident
        FOREIGN KEY (resident_id) REFERENCES residents(resident_id)
);

CREATE INDEX IX_education_records_resident ON education_records(resident_id);
CREATE INDEX IX_education_records_date     ON education_records(record_date);

CREATE TABLE health_wellbeing_records (
    health_record_id         INT             PRIMARY KEY,
    resident_id              INT             NOT NULL,
    record_date              DATE            NOT NULL,
    general_health_score     DECIMAL(4,2)    NULL,
    nutrition_score          DECIMAL(4,2)    NULL,
    sleep_quality_score      DECIMAL(4,2)    NULL,
    energy_level_score       DECIMAL(4,2)    NULL,
    height_cm                DECIMAL(5,1)    NULL,
    weight_kg                DECIMAL(5,1)    NULL,
    bmi                      DECIMAL(5,2)    NULL,
    medical_checkup_done     BIT             NOT NULL DEFAULT 0,
    dental_checkup_done      BIT             NOT NULL DEFAULT 0,
    psychological_checkup_done BIT           NOT NULL DEFAULT 0,
    notes                    NVARCHAR(MAX)   NULL,

    CONSTRAINT FK_health_records_resident
        FOREIGN KEY (resident_id) REFERENCES residents(resident_id)
);

CREATE INDEX IX_health_records_resident ON health_wellbeing_records(resident_id);
CREATE INDEX IX_health_records_date     ON health_wellbeing_records(record_date);

CREATE TABLE intervention_plans (
    plan_id                  INT             PRIMARY KEY,
    resident_id              INT             NOT NULL,
    plan_category            NVARCHAR(50)    NOT NULL,       -- Safety, Education, Physical Health, Mental Health
    plan_description         NVARCHAR(MAX)   NULL,
    services_provided        NVARCHAR(MAX)   NULL,           -- Comma-separated: Healing, Legal, Teaching, etc.
    target_value             DECIMAL(10,2)   NULL,
    target_date              DATE            NULL,
    status                   NVARCHAR(30)    NOT NULL DEFAULT 'In Progress', -- On Hold, In Progress, Completed
    case_conference_date     DATE            NULL,
    created_at               DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
    updated_at               DATETIME2       NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT FK_intervention_plans_resident
        FOREIGN KEY (resident_id) REFERENCES residents(resident_id)
);

CREATE INDEX IX_intervention_plans_resident ON intervention_plans(resident_id);
CREATE INDEX IX_intervention_plans_status   ON intervention_plans(status);

CREATE TABLE incident_reports (
    incident_id              INT             PRIMARY KEY,
    resident_id              INT             NOT NULL,
    safehouse_id             INT             NOT NULL,
    incident_date            DATE            NOT NULL,
    incident_type            NVARCHAR(50)    NOT NULL,       -- Medical, Security, RunawayAttempt, Behavioral
    severity                 NVARCHAR(20)    NOT NULL,       -- Low, Medium, High, Critical
    description              NVARCHAR(MAX)   NULL,
    response_taken           NVARCHAR(MAX)   NULL,
    resolved                 BIT             NOT NULL DEFAULT 0,
    resolution_date          DATE            NULL,
    reported_by              NVARCHAR(20)    NULL,           -- SW-xx reference
    follow_up_required       BIT             NOT NULL DEFAULT 0,

    CONSTRAINT FK_incident_reports_resident
        FOREIGN KEY (resident_id) REFERENCES residents(resident_id),
    CONSTRAINT FK_incident_reports_safehouse
        FOREIGN KEY (safehouse_id) REFERENCES safehouses(safehouse_id)
);

CREATE INDEX IX_incident_reports_resident  ON incident_reports(resident_id);
CREATE INDEX IX_incident_reports_safehouse ON incident_reports(safehouse_id);
CREATE INDEX IX_incident_reports_date      ON incident_reports(incident_date);
CREATE INDEX IX_incident_reports_severity  ON incident_reports(severity);


-- ============================================================
-- DOMAIN 4: OUTREACH & COMMUNICATION
-- ============================================================

CREATE TABLE social_media_posts (
    post_id                  INT             PRIMARY KEY,
    platform                 NVARCHAR(30)    NOT NULL,       -- WhatsApp, Instagram, LinkedIn, Facebook, TikTok
    platform_post_id         NVARCHAR(100)   NULL,
    post_url                 NVARCHAR(500)   NULL,
    created_at               DATETIME2       NOT NULL,
    day_of_week              NVARCHAR(15)    NULL,
    post_hour                INT             NULL,           -- 0-23
    post_type                NVARCHAR(50)    NOT NULL,       -- FundraisingAppeal, EducationalContent, EventPromotion, ThankYou
    media_type               NVARCHAR(20)    NOT NULL,       -- Text, Photo, Video, Carousel
    caption                  NVARCHAR(MAX)   NULL,
    hashtags                 NVARCHAR(MAX)   NULL,           -- Comma-separated
    num_hashtags             INT             NOT NULL DEFAULT 0,
    mentions_count           INT             NOT NULL DEFAULT 0,
    has_call_to_action       BIT             NOT NULL DEFAULT 0,
    call_to_action_type      NVARCHAR(50)    NULL,
    content_topic            NVARCHAR(50)    NULL,           -- Education, Reintegration, Health, etc.
    sentiment_tone           NVARCHAR(30)    NULL,           -- Grateful, Celebratory, Urgent, Emotional
    caption_length           INT             NULL,
    features_resident_story  BIT             NOT NULL DEFAULT 0,
    campaign_name            NVARCHAR(200)   NULL,
    is_boosted               BIT             NOT NULL DEFAULT 0,
    boost_budget_php         DECIMAL(10,2)   NULL,

    -- Engagement metrics
    impressions              INT             NOT NULL DEFAULT 0,
    reach                    INT             NOT NULL DEFAULT 0,
    likes                    INT             NOT NULL DEFAULT 0,
    comments                 INT             NOT NULL DEFAULT 0,
    shares                   INT             NOT NULL DEFAULT 0,
    saves                    INT             NOT NULL DEFAULT 0,
    click_throughs           INT             NOT NULL DEFAULT 0,
    video_views              INT             NULL,
    engagement_rate          DECIMAL(8,6)    NULL,
    profile_visits           INT             NOT NULL DEFAULT 0,
    donation_referrals       INT             NOT NULL DEFAULT 0,
    estimated_donation_value_php DECIMAL(12,2) NULL,
    follower_count_at_post   INT             NULL,
    watch_time_seconds       DECIMAL(10,2)   NULL,
    avg_view_duration_seconds DECIMAL(8,2)   NULL,
    subscriber_count_at_post INT             NULL,
    forwards                 INT             NULL
);

CREATE INDEX IX_social_media_posts_platform ON social_media_posts(platform);
CREATE INDEX IX_social_media_posts_date     ON social_media_posts(created_at);
CREATE INDEX IX_social_media_posts_type     ON social_media_posts(post_type);
CREATE INDEX IX_social_media_posts_campaign ON social_media_posts(campaign_name) WHERE campaign_name IS NOT NULL;

-- Now add the deferred FK from donations → social_media_posts
ALTER TABLE donations
    ADD CONSTRAINT FK_donations_referral_post
        FOREIGN KEY (referral_post_id) REFERENCES social_media_posts(post_id);


-- ============================================================
-- DOMAIN 5: REPORTING & ANALYTICS
-- ============================================================

CREATE TABLE safehouse_monthly_metrics (
    metric_id                INT             PRIMARY KEY,
    safehouse_id             INT             NOT NULL,
    month_start              DATE            NOT NULL,
    month_end                DATE            NOT NULL,
    active_residents         INT             NOT NULL DEFAULT 0,
    avg_education_progress   DECIMAL(5,2)    NULL,
    avg_health_score         DECIMAL(4,2)    NULL,
    process_recording_count  INT             NOT NULL DEFAULT 0,
    home_visitation_count    INT             NOT NULL DEFAULT 0,
    incident_count           INT             NOT NULL DEFAULT 0,
    notes                    NVARCHAR(MAX)   NULL,

    CONSTRAINT FK_monthly_metrics_safehouse
        FOREIGN KEY (safehouse_id) REFERENCES safehouses(safehouse_id),
    CONSTRAINT UQ_monthly_metrics_safehouse_month
        UNIQUE (safehouse_id, month_start)
);

CREATE INDEX IX_monthly_metrics_safehouse ON safehouse_monthly_metrics(safehouse_id);
CREATE INDEX IX_monthly_metrics_period    ON safehouse_monthly_metrics(month_start, month_end);

CREATE TABLE public_impact_snapshots (
    snapshot_id              INT             PRIMARY KEY,
    snapshot_date            DATE            NOT NULL,
    headline                 NVARCHAR(300)   NOT NULL,
    summary_text             NVARCHAR(MAX)   NULL,
    metric_payload_json      NVARCHAR(MAX)   NULL,           -- JSON: month, avg_health_score, avg_education_progress, total_residents, donations_total
    is_published             BIT             NOT NULL DEFAULT 0,
    published_at             DATE            NULL
);

CREATE INDEX IX_impact_snapshots_published ON public_impact_snapshots(is_published, published_at);


-- ============================================================
-- RELATIONSHIP SUMMARY (Entity-Relationship Overview)
-- ============================================================
--
--  safehouses ─┬─< partner_assignments >── partners
--              ├─< residents ─┬─< process_recordings
--              │              ├─< home_visitations
--              │              ├─< education_records
--              │              ├─< health_wellbeing_records
--              │              ├─< intervention_plans
--              │              └─< incident_reports >── safehouses
--              ├─< donation_allocations >── donations ── supporters
--              │                                    └─< in_kind_donation_items
--              └─< safehouse_monthly_metrics
--
--  social_media_posts ──< donations (via referral_post_id)
--  public_impact_snapshots (standalone aggregation table)
--
-- Row counts from CSV:
--   safehouses: 9          partners: 30           partner_assignments: 48
--   supporters: 60         donations: 420         donation_allocations: 521
--   in_kind_donation_items: 129                   residents: 60
--   process_recordings: 2,819                     home_visitations: 1,337
--   education_records: 534                        health_wellbeing_records: 534
--   intervention_plans: 180                       incident_reports: 100
--   social_media_posts: 812                       safehouse_monthly_metrics: 450
--   public_impact_snapshots: 50
-- ============================================================
