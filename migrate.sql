IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260406233041_InitialCreate'
)
BEGIN
    CREATE TABLE [AspNetRoles] (
        [Id] nvarchar(450) NOT NULL,
        [Name] nvarchar(256) NULL,
        [NormalizedName] nvarchar(256) NULL,
        [ConcurrencyStamp] nvarchar(max) NULL,
        CONSTRAINT [PK_AspNetRoles] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260406233041_InitialCreate'
)
BEGIN
    CREATE TABLE [AspNetUsers] (
        [Id] nvarchar(450) NOT NULL,
        [UserName] nvarchar(256) NULL,
        [NormalizedUserName] nvarchar(256) NULL,
        [Email] nvarchar(256) NULL,
        [NormalizedEmail] nvarchar(256) NULL,
        [EmailConfirmed] bit NOT NULL,
        [PasswordHash] nvarchar(max) NULL,
        [SecurityStamp] nvarchar(max) NULL,
        [ConcurrencyStamp] nvarchar(max) NULL,
        [PhoneNumber] nvarchar(max) NULL,
        [PhoneNumberConfirmed] bit NOT NULL,
        [TwoFactorEnabled] bit NOT NULL,
        [LockoutEnd] datetimeoffset NULL,
        [LockoutEnabled] bit NOT NULL,
        [AccessFailedCount] int NOT NULL,
        CONSTRAINT [PK_AspNetUsers] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260406233041_InitialCreate'
)
BEGIN
    CREATE TABLE [donations] (
        [donation_id] int NOT NULL IDENTITY,
        [supporter_id] int NOT NULL,
        [donation_type] nvarchar(max) NULL,
        [donation_date] datetime2 NULL,
        [is_recurring] bit NULL,
        [campaign_name] nvarchar(max) NULL,
        [channel_source] nvarchar(max) NULL,
        [currency_code] nvarchar(max) NULL,
        [amount] decimal(12,2) NULL,
        [estimated_value] decimal(12,2) NULL,
        [impact_unit] nvarchar(max) NULL,
        [notes] nvarchar(max) NULL,
        [referral_post_id] int NULL,
        CONSTRAINT [PK_donations] PRIMARY KEY ([donation_id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260406233041_InitialCreate'
)
BEGIN
    CREATE TABLE [home_visitations] (
        [visitation_id] int NOT NULL IDENTITY,
        [resident_id] int NOT NULL,
        [visit_date] datetime2 NULL,
        [social_worker] nvarchar(max) NULL,
        [visit_type] nvarchar(max) NULL,
        [location_visited] nvarchar(max) NULL,
        [family_members_present] nvarchar(max) NULL,
        [purpose] nvarchar(max) NULL,
        [observations] nvarchar(max) NULL,
        [family_cooperation_level] nvarchar(max) NULL,
        [safety_concerns_noted] bit NULL,
        [follow_up_needed] bit NULL,
        [follow_up_notes] nvarchar(max) NULL,
        [visit_outcome] nvarchar(max) NULL,
        CONSTRAINT [PK_home_visitations] PRIMARY KEY ([visitation_id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260406233041_InitialCreate'
)
BEGIN
    CREATE TABLE [process_recordings] (
        [recording_id] int NOT NULL IDENTITY,
        [resident_id] int NOT NULL,
        [session_date] datetime2 NULL,
        [social_worker] nvarchar(max) NULL,
        [session_type] nvarchar(max) NULL,
        [session_duration_minutes] int NULL,
        [emotional_state_observed] nvarchar(max) NULL,
        [emotional_state_end] nvarchar(max) NULL,
        [session_narrative] nvarchar(max) NULL,
        [interventions_applied] nvarchar(max) NULL,
        [follow_up_actions] nvarchar(max) NULL,
        [progress_noted] bit NULL,
        [concerns_flagged] bit NULL,
        [referral_made] bit NULL,
        [notes_restricted] nvarchar(max) NULL,
        CONSTRAINT [PK_process_recordings] PRIMARY KEY ([recording_id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260406233041_InitialCreate'
)
BEGIN
    CREATE TABLE [safehouses] (
        [safehouse_id] int NOT NULL IDENTITY,
        [safehouse_code] nvarchar(max) NULL,
        [name] nvarchar(max) NOT NULL,
        [region] nvarchar(max) NULL,
        [city] nvarchar(max) NULL,
        [province] nvarchar(max) NULL,
        [country] nvarchar(max) NULL,
        [open_date] datetime2 NULL,
        [status] nvarchar(max) NULL,
        [capacity_girls] int NULL,
        [capacity_staff] int NULL,
        [current_occupancy] int NULL,
        [notes] nvarchar(max) NULL,
        CONSTRAINT [PK_safehouses] PRIMARY KEY ([safehouse_id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260406233041_InitialCreate'
)
BEGIN
    CREATE TABLE [supporters] (
        [supporter_id] int NOT NULL IDENTITY,
        [supporter_type] nvarchar(max) NOT NULL,
        [display_name] nvarchar(max) NOT NULL,
        [organization_name] nvarchar(max) NULL,
        [first_name] nvarchar(max) NOT NULL,
        [last_name] nvarchar(max) NOT NULL,
        [relationship_type] nvarchar(max) NOT NULL,
        [region] nvarchar(max) NOT NULL,
        [country] nvarchar(max) NOT NULL,
        [email] nvarchar(max) NOT NULL,
        [phone] nvarchar(max) NULL,
        [status] nvarchar(max) NULL,
        [created_at] datetime2 NULL,
        [first_donation_date] datetime2 NULL,
        [acquisition_channel] nvarchar(max) NULL,
        CONSTRAINT [PK_supporters] PRIMARY KEY ([supporter_id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260406233041_InitialCreate'
)
BEGIN
    CREATE TABLE [AspNetRoleClaims] (
        [Id] int NOT NULL IDENTITY,
        [RoleId] nvarchar(450) NOT NULL,
        [ClaimType] nvarchar(max) NULL,
        [ClaimValue] nvarchar(max) NULL,
        CONSTRAINT [PK_AspNetRoleClaims] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AspNetRoleClaims_AspNetRoles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [AspNetRoles] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260406233041_InitialCreate'
)
BEGIN
    CREATE TABLE [AspNetUserClaims] (
        [Id] int NOT NULL IDENTITY,
        [UserId] nvarchar(450) NOT NULL,
        [ClaimType] nvarchar(max) NULL,
        [ClaimValue] nvarchar(max) NULL,
        CONSTRAINT [PK_AspNetUserClaims] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AspNetUserClaims_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260406233041_InitialCreate'
)
BEGIN
    CREATE TABLE [AspNetUserLogins] (
        [LoginProvider] nvarchar(450) NOT NULL,
        [ProviderKey] nvarchar(450) NOT NULL,
        [ProviderDisplayName] nvarchar(max) NULL,
        [UserId] nvarchar(450) NOT NULL,
        CONSTRAINT [PK_AspNetUserLogins] PRIMARY KEY ([LoginProvider], [ProviderKey]),
        CONSTRAINT [FK_AspNetUserLogins_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260406233041_InitialCreate'
)
BEGIN
    CREATE TABLE [AspNetUserRoles] (
        [UserId] nvarchar(450) NOT NULL,
        [RoleId] nvarchar(450) NOT NULL,
        CONSTRAINT [PK_AspNetUserRoles] PRIMARY KEY ([UserId], [RoleId]),
        CONSTRAINT [FK_AspNetUserRoles_AspNetRoles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [AspNetRoles] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_AspNetUserRoles_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260406233041_InitialCreate'
)
BEGIN
    CREATE TABLE [AspNetUserTokens] (
        [UserId] nvarchar(450) NOT NULL,
        [LoginProvider] nvarchar(450) NOT NULL,
        [Name] nvarchar(450) NOT NULL,
        [Value] nvarchar(max) NULL,
        CONSTRAINT [PK_AspNetUserTokens] PRIMARY KEY ([UserId], [LoginProvider], [Name]),
        CONSTRAINT [FK_AspNetUserTokens_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260406233041_InitialCreate'
)
BEGIN
    CREATE TABLE [residents] (
        [resident_id] int NOT NULL IDENTITY,
        [case_control_no] nvarchar(max) NULL,
        [internal_code] nvarchar(max) NULL,
        [safehouse_id] int NOT NULL,
        [case_status] nvarchar(max) NULL,
        [sex] nvarchar(max) NULL,
        [date_of_birth] datetime2 NULL,
        [birth_status] nvarchar(max) NULL,
        [place_of_birth] nvarchar(max) NULL,
        [religion] nvarchar(max) NULL,
        [case_category] nvarchar(max) NULL,
        [sub_cat_orphaned] bit NULL,
        [sub_cat_trafficked] bit NULL,
        [sub_cat_child_labor] bit NULL,
        [sub_cat_physical_abuse] bit NULL,
        [sub_cat_sexual_abuse] bit NULL,
        [sub_cat_osaec] bit NULL,
        [sub_cat_cicl] bit NULL,
        [sub_cat_at_risk] bit NULL,
        [sub_cat_street_child] bit NULL,
        [sub_cat_child_with_hiv] bit NULL,
        [is_pwd] bit NULL,
        [pwd_type] nvarchar(max) NULL,
        [has_special_needs] bit NULL,
        [special_needs_diagnosis] nvarchar(max) NULL,
        [family_is_4ps] bit NULL,
        [family_solo_parent] bit NULL,
        [family_indigenous] bit NULL,
        [family_parent_pwd] bit NULL,
        [family_informal_settler] bit NULL,
        [date_of_admission] datetime2 NULL,
        [age_upon_admission] nvarchar(max) NULL,
        [present_age] nvarchar(max) NULL,
        [length_of_stay] nvarchar(max) NULL,
        [referral_source] nvarchar(max) NULL,
        [referring_agency_person] nvarchar(max) NULL,
        [date_colb_registered] datetime2 NULL,
        [date_colb_obtained] datetime2 NULL,
        [assigned_social_worker] nvarchar(max) NULL,
        [initial_case_assessment] nvarchar(max) NULL,
        [date_case_study_prepared] datetime2 NULL,
        [reintegration_type] nvarchar(max) NULL,
        [reintegration_status] nvarchar(max) NULL,
        [initial_risk_level] nvarchar(max) NULL,
        [current_risk_level] nvarchar(max) NULL,
        [date_enrolled] datetime2 NULL,
        [date_closed] datetime2 NULL,
        [created_at] datetime2 NULL,
        [notes_restricted] nvarchar(max) NULL,
        CONSTRAINT [PK_residents] PRIMARY KEY ([resident_id]),
        CONSTRAINT [FK_residents_safehouses_safehouse_id] FOREIGN KEY ([safehouse_id]) REFERENCES [safehouses] ([safehouse_id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260406233041_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_AspNetRoleClaims_RoleId] ON [AspNetRoleClaims] ([RoleId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260406233041_InitialCreate'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [RoleNameIndex] ON [AspNetRoles] ([NormalizedName]) WHERE [NormalizedName] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260406233041_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_AspNetUserClaims_UserId] ON [AspNetUserClaims] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260406233041_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_AspNetUserLogins_UserId] ON [AspNetUserLogins] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260406233041_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_AspNetUserRoles_RoleId] ON [AspNetUserRoles] ([RoleId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260406233041_InitialCreate'
)
BEGIN
    CREATE INDEX [EmailIndex] ON [AspNetUsers] ([NormalizedEmail]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260406233041_InitialCreate'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [UserNameIndex] ON [AspNetUsers] ([NormalizedUserName]) WHERE [NormalizedUserName] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260406233041_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_residents_safehouse_id] ON [residents] ([safehouse_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260406233041_InitialCreate'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260406233041_InitialCreate', N'10.0.0');
END;

COMMIT;
GO

