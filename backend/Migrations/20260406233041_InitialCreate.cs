using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Intex2026.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AspNetRoles",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    NormalizedName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUsers",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    UserName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    NormalizedUserName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    Email = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    NormalizedEmail = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    EmailConfirmed = table.Column<bool>(type: "bit", nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SecurityStamp = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PhoneNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PhoneNumberConfirmed = table.Column<bool>(type: "bit", nullable: false),
                    TwoFactorEnabled = table.Column<bool>(type: "bit", nullable: false),
                    LockoutEnd = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LockoutEnabled = table.Column<bool>(type: "bit", nullable: false),
                    AccessFailedCount = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUsers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "donations",
                columns: table => new
                {
                    donation_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    supporter_id = table.Column<int>(type: "int", nullable: false),
                    donation_type = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    donation_date = table.Column<DateTime>(type: "datetime2", nullable: true),
                    is_recurring = table.Column<bool>(type: "bit", nullable: true),
                    campaign_name = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    channel_source = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    currency_code = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    amount = table.Column<decimal>(type: "decimal(12,2)", nullable: true),
                    estimated_value = table.Column<decimal>(type: "decimal(12,2)", nullable: true),
                    impact_unit = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    referral_post_id = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_donations", x => x.donation_id);
                });

            migrationBuilder.CreateTable(
                name: "home_visitations",
                columns: table => new
                {
                    visitation_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    resident_id = table.Column<int>(type: "int", nullable: false),
                    visit_date = table.Column<DateTime>(type: "datetime2", nullable: true),
                    social_worker = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    visit_type = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    location_visited = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    family_members_present = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    purpose = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    observations = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    family_cooperation_level = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    safety_concerns_noted = table.Column<bool>(type: "bit", nullable: true),
                    follow_up_needed = table.Column<bool>(type: "bit", nullable: true),
                    follow_up_notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    visit_outcome = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_home_visitations", x => x.visitation_id);
                });

            migrationBuilder.CreateTable(
                name: "process_recordings",
                columns: table => new
                {
                    recording_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    resident_id = table.Column<int>(type: "int", nullable: false),
                    session_date = table.Column<DateTime>(type: "datetime2", nullable: true),
                    social_worker = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    session_type = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    session_duration_minutes = table.Column<int>(type: "int", nullable: true),
                    emotional_state_observed = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    emotional_state_end = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    session_narrative = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    interventions_applied = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    follow_up_actions = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    progress_noted = table.Column<bool>(type: "bit", nullable: true),
                    concerns_flagged = table.Column<bool>(type: "bit", nullable: true),
                    referral_made = table.Column<bool>(type: "bit", nullable: true),
                    notes_restricted = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_process_recordings", x => x.recording_id);
                });

            migrationBuilder.CreateTable(
                name: "safehouses",
                columns: table => new
                {
                    safehouse_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    safehouse_code = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    region = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    city = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    province = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    country = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    open_date = table.Column<DateTime>(type: "datetime2", nullable: true),
                    status = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    capacity_girls = table.Column<int>(type: "int", nullable: true),
                    capacity_staff = table.Column<int>(type: "int", nullable: true),
                    current_occupancy = table.Column<int>(type: "int", nullable: true),
                    notes = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_safehouses", x => x.safehouse_id);
                });

            migrationBuilder.CreateTable(
                name: "supporters",
                columns: table => new
                {
                    supporter_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    supporter_type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    display_name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    organization_name = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    first_name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    last_name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    relationship_type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    region = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    country = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    email = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    phone = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    status = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    first_donation_date = table.Column<DateTime>(type: "datetime2", nullable: true),
                    acquisition_channel = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_supporters", x => x.supporter_id);
                });

            migrationBuilder.CreateTable(
                name: "AspNetRoleClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RoleId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ClaimType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ClaimValue = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoleClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetRoleClaims_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ClaimType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ClaimValue = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetUserClaims_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserLogins",
                columns: table => new
                {
                    LoginProvider = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ProviderKey = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ProviderDisplayName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserLogins", x => new { x.LoginProvider, x.ProviderKey });
                    table.ForeignKey(
                        name: "FK_AspNetUserLogins_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserRoles",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    RoleId = table.Column<string>(type: "nvarchar(450)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserRoles", x => new { x.UserId, x.RoleId });
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserTokens",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    LoginProvider = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Value = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserTokens", x => new { x.UserId, x.LoginProvider, x.Name });
                    table.ForeignKey(
                        name: "FK_AspNetUserTokens_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "residents",
                columns: table => new
                {
                    resident_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    case_control_no = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    internal_code = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    safehouse_id = table.Column<int>(type: "int", nullable: false),
                    case_status = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    sex = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    date_of_birth = table.Column<DateTime>(type: "datetime2", nullable: true),
                    birth_status = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    place_of_birth = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    religion = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    case_category = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    sub_cat_orphaned = table.Column<bool>(type: "bit", nullable: true),
                    sub_cat_trafficked = table.Column<bool>(type: "bit", nullable: true),
                    sub_cat_child_labor = table.Column<bool>(type: "bit", nullable: true),
                    sub_cat_physical_abuse = table.Column<bool>(type: "bit", nullable: true),
                    sub_cat_sexual_abuse = table.Column<bool>(type: "bit", nullable: true),
                    sub_cat_osaec = table.Column<bool>(type: "bit", nullable: true),
                    sub_cat_cicl = table.Column<bool>(type: "bit", nullable: true),
                    sub_cat_at_risk = table.Column<bool>(type: "bit", nullable: true),
                    sub_cat_street_child = table.Column<bool>(type: "bit", nullable: true),
                    sub_cat_child_with_hiv = table.Column<bool>(type: "bit", nullable: true),
                    is_pwd = table.Column<bool>(type: "bit", nullable: true),
                    pwd_type = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    has_special_needs = table.Column<bool>(type: "bit", nullable: true),
                    special_needs_diagnosis = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    family_is_4ps = table.Column<bool>(type: "bit", nullable: true),
                    family_solo_parent = table.Column<bool>(type: "bit", nullable: true),
                    family_indigenous = table.Column<bool>(type: "bit", nullable: true),
                    family_parent_pwd = table.Column<bool>(type: "bit", nullable: true),
                    family_informal_settler = table.Column<bool>(type: "bit", nullable: true),
                    date_of_admission = table.Column<DateTime>(type: "datetime2", nullable: true),
                    age_upon_admission = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    present_age = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    length_of_stay = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    referral_source = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    referring_agency_person = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    date_colb_registered = table.Column<DateTime>(type: "datetime2", nullable: true),
                    date_colb_obtained = table.Column<DateTime>(type: "datetime2", nullable: true),
                    assigned_social_worker = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    initial_case_assessment = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    date_case_study_prepared = table.Column<DateTime>(type: "datetime2", nullable: true),
                    reintegration_type = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    reintegration_status = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    initial_risk_level = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    current_risk_level = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    date_enrolled = table.Column<DateTime>(type: "datetime2", nullable: true),
                    date_closed = table.Column<DateTime>(type: "datetime2", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    notes_restricted = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_residents", x => x.resident_id);
                    table.ForeignKey(
                        name: "FK_residents_safehouses_safehouse_id",
                        column: x => x.safehouse_id,
                        principalTable: "safehouses",
                        principalColumn: "safehouse_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AspNetRoleClaims_RoleId",
                table: "AspNetRoleClaims",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "RoleNameIndex",
                table: "AspNetRoles",
                column: "NormalizedName",
                unique: true,
                filter: "[NormalizedName] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserClaims_UserId",
                table: "AspNetUserClaims",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserLogins_UserId",
                table: "AspNetUserLogins",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserRoles_RoleId",
                table: "AspNetUserRoles",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "EmailIndex",
                table: "AspNetUsers",
                column: "NormalizedEmail");

            migrationBuilder.CreateIndex(
                name: "UserNameIndex",
                table: "AspNetUsers",
                column: "NormalizedUserName",
                unique: true,
                filter: "[NormalizedUserName] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_residents_safehouse_id",
                table: "residents",
                column: "safehouse_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AspNetRoleClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserLogins");

            migrationBuilder.DropTable(
                name: "AspNetUserRoles");

            migrationBuilder.DropTable(
                name: "AspNetUserTokens");

            migrationBuilder.DropTable(
                name: "donations");

            migrationBuilder.DropTable(
                name: "home_visitations");

            migrationBuilder.DropTable(
                name: "process_recordings");

            migrationBuilder.DropTable(
                name: "residents");

            migrationBuilder.DropTable(
                name: "supporters");

            migrationBuilder.DropTable(
                name: "AspNetRoles");

            migrationBuilder.DropTable(
                name: "AspNetUsers");

            migrationBuilder.DropTable(
                name: "safehouses");
        }
    }
}
