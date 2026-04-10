using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Intex2026.Api.Data;
using Intex2026.Api.Models;

var builder = WebApplication.CreateBuilder(args);


// ---------- Services ----------

// EF Core — application database
// Suppress PendingModelChangesWarning: EF Core 10 throws on any mismatch
// between the live model and the last snapshot, which fires when migrations
// are authored by hand in this sandbox (no `dotnet ef migrations add`
// available). We still apply migrations at startup and additionally run a
// defensive raw-SQL patch (see below) so the schema is guaranteed to be
// current — the warning is noise in that workflow.
builder.Services.AddDbContext<AppDbContext>(options =>
    options
        .UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"))
        .ConfigureWarnings(w => w.Ignore(
            Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning)));

// EF Core — identity database
builder.Services.AddDbContext<IdentityContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("IdentityConnection")));

// ASP.NET Identity — using ApplicationUser so Region/City columns exist on ASPNetUsers
builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
{
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = true;
    options.Password.RequireNonAlphanumeric = true;
    options.Password.RequiredLength = 14;
    options.Password.RequiredUniqueChars = 6;
})
.AddEntityFrameworkStores<IdentityContext>()
.AddDefaultTokenProviders();

// JWT Authentication
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
    };

    // Reject tokens whose security stamp no longer matches the DB.
    // This forces a re-login whenever an admin changes a user's role.
    options.Events = new JwtBearerEvents
    {
        OnTokenValidated = async ctx =>
        {
            var userManager = ctx.HttpContext.RequestServices
                .GetRequiredService<UserManager<ApplicationUser>>();
            var userId = ctx.Principal?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                      ?? ctx.Principal?.FindFirst("sub")?.Value;
            if (userId == null) { ctx.Fail("No user id in token."); return; }

            var user = await userManager.FindByIdAsync(userId);
            if (user == null) { ctx.Fail("User not found."); return; }

            // If the security stamp in the token doesn't match the DB, reject it.
            var tokenStamp = ctx.Principal?.FindFirst("AspNet.Identity.SecurityStamp")?.Value;
            if (tokenStamp != null && tokenStamp != user.SecurityStamp)
            {
                ctx.Fail("Security stamp mismatch — please log in again.");
            }
        }
    };
});

builder.Services.AddAuthorization();

builder.Services.AddHsts(options =>
{
    options.MaxAge = TimeSpan.FromDays(365);
    options.IncludeSubDomains = true;
});

builder.Services.AddControllers(options =>
{
    // Trim whitespace and strip HTML tags from all incoming string values
    // before any controller action runs — guards against stored XSS.
    options.Filters.Add<Intex2026.Api.Filters.SanitizeInputFilter>();
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter 'Bearer' followed by your JWT token. Example: Bearer eyJhbG..."
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// CORS — reads allowed origins from configuration so the same binary works
// in development (localhost:5173) and in Azure (the deployed frontend URL).
var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:5173", "https://localhost:5173" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("AppCors", policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

var app = builder.Build();

// ---------- Defensive schema patch (runs BEFORE migrations) ----------
// Ensure `created_by_user_id` exists on process_recordings and
// home_visitations. These columns are referenced by the ProcessRecording /
// HomeVisitation models, so they MUST exist before any SELECT runs or EF
// will blow up with "Invalid column name 'created_by_user_id'". We run
// this in its OWN scope + try/catch, BEFORE MigrateAsync, so the column
// is guaranteed to exist even if MigrateAsync throws
// (e.g. PendingModelChangesWarning in hand-authored migration workflows).
using (var patchScope = app.Services.CreateScope())
{
    var patchLogger = patchScope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    try
    {
        var patchDb = patchScope.ServiceProvider.GetRequiredService<AppDbContext>();
        await patchDb.Database.ExecuteSqlRawAsync(@"
            IF NOT EXISTS (
                SELECT 1 FROM sys.columns
                WHERE Name = N'created_by_user_id'
                  AND Object_ID = Object_ID(N'dbo.process_recordings')
            )
            BEGIN
                ALTER TABLE process_recordings
                ADD created_by_user_id NVARCHAR(450) NULL;
            END
        ");
        await patchDb.Database.ExecuteSqlRawAsync(@"
            IF NOT EXISTS (
                SELECT 1 FROM sys.columns
                WHERE Name = N'created_by_user_id'
                  AND Object_ID = Object_ID(N'dbo.home_visitations')
            )
            BEGIN
                ALTER TABLE home_visitations
                ADD created_by_user_id NVARCHAR(450) NULL;
            END
        ");
        await patchDb.Database.ExecuteSqlRawAsync(@"
            IF NOT EXISTS (
                SELECT 1 FROM sys.columns
                WHERE Name = N'created_by_user_id'
                  AND Object_ID = Object_ID(N'dbo.intervention_plans')
            )
            BEGIN
                ALTER TABLE intervention_plans
                ADD created_by_user_id NVARCHAR(450) NULL;
            END
        ");
        patchLogger.LogInformation("created_by_user_id columns verified (incl. intervention_plans).");
    }
    catch (Exception ex)
    {
        patchLogger.LogError(ex, "Failed to patch created_by_user_id columns.");
    }
}

// ---------- Apply pending migrations and seed on startup ----------
using (var scope = app.Services.CreateScope())
{
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    try
    {
        // Apply any pending EF Core migrations automatically
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var pending = await db.Database.GetPendingMigrationsAsync();
        if (pending.Any())
        {
            logger.LogInformation("Applying {Count} pending migration(s)...", pending.Count());
            await db.Database.MigrateAsync();
            logger.LogInformation("Migrations applied successfully.");
        }

        // Apply any pending Identity migrations automatically
        var identityDb = scope.ServiceProvider.GetRequiredService<IdentityContext>();
        var identityPending = await identityDb.Database.GetPendingMigrationsAsync();
        if (identityPending.Any())
        {
            logger.LogInformation("Applying {Count} pending Identity migration(s)...", identityPending.Count());
            await identityDb.Database.MigrateAsync();
            logger.LogInformation("Identity migrations applied successfully.");
        }

        // Ensure the donor_messages table exists (added Apr 9 2026).
        // Uses raw SQL with IF NOT EXISTS so it's idempotent and doesn't
        // require a formal EF Core migration (which would need the CLI to
        // generate the Designer file).
        await db.Database.ExecuteSqlRawAsync(@"
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='donor_messages' AND xtype='U')
            BEGIN
                CREATE TABLE donor_messages (
                    message_id        INT             PRIMARY KEY,
                    supporter_id      INT             NOT NULL,
                    sender_user_id    NVARCHAR(450)   NOT NULL DEFAULT '',
                    sender_name       NVARCHAR(256)   NOT NULL DEFAULT '',
                    template_type     NVARCHAR(50)    NULL,
                    subject           NVARCHAR(500)   NOT NULL DEFAULT '',
                    body              NVARCHAR(MAX)   NOT NULL DEFAULT '',
                    is_read           BIT             NOT NULL DEFAULT 0,
                    created_at        DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
                    read_at           DATETIME2       NULL
                );
                CREATE INDEX IX_donor_messages_supporter ON donor_messages(supporter_id);
                CREATE INDEX IX_donor_messages_created   ON donor_messages(created_at);
            END
        ");

        // Ensure the password_reset_requests table exists (added Apr 9 2026).
        await db.Database.ExecuteSqlRawAsync(@"
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='password_reset_requests' AND xtype='U')
            BEGIN
                CREATE TABLE password_reset_requests (
                    request_id            INT             PRIMARY KEY,
                    email                 NVARCHAR(256)   NOT NULL,
                    status                NVARCHAR(50)    NOT NULL DEFAULT 'Pending',
                    created_at            DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
                    resolved_at           DATETIME2       NULL,
                    resolved_by_user_id   NVARCHAR(450)   NULL,
                    temp_password         NVARCHAR(200)   NULL
                );
                CREATE INDEX IX_pwd_reset_email  ON password_reset_requests(email);
                CREATE INDEX IX_pwd_reset_status ON password_reset_requests(status);
            END
        ");

        // Add created_by_user_id column to process_recordings and home_visitations
        // so the backend can track who created each record and enforce per-row
        // ownership for Staff users (Staff can only edit/delete their own rows).
        await db.Database.ExecuteSqlRawAsync(@"
            IF NOT EXISTS (
                SELECT 1 FROM sys.columns
                WHERE object_id = OBJECT_ID('process_recordings')
                  AND name = 'created_by_user_id'
            )
            ALTER TABLE process_recordings ADD created_by_user_id NVARCHAR(450) NULL;
        ");
        await db.Database.ExecuteSqlRawAsync(@"
            IF NOT EXISTS (
                SELECT 1 FROM sys.columns
                WHERE object_id = OBJECT_ID('home_visitations')
                  AND name = 'created_by_user_id'
            )
            ALTER TABLE home_visitations ADD created_by_user_id NVARCHAR(450) NULL;
        ");
        await db.Database.ExecuteSqlRawAsync(@"
            IF NOT EXISTS (
                SELECT 1 FROM sys.columns
                WHERE object_id = OBJECT_ID('intervention_plans')
                  AND name = 'created_by_user_id'
            )
            ALTER TABLE intervention_plans ADD created_by_user_id NVARCHAR(450) NULL;
        ");

        // ── Case Conferences (added Apr 9 2026) ─────────────────────────────
        // Create the case_conferences table if it doesn't exist.
        await db.Database.ExecuteSqlRawAsync(@"
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='case_conferences' AND xtype='U')
            BEGIN
                CREATE TABLE case_conferences (
                    conference_id       INT             PRIMARY KEY,
                    resident_id         INT             NOT NULL,
                    conference_date     DATE            NULL,
                    attendees           NVARCHAR(MAX)   NULL,
                    conference_notes    NVARCHAR(MAX)   NULL,
                    next_review_date    DATE            NULL,
                    assigned_to         NVARCHAR(100)   NULL,
                    status              NVARCHAR(30)    NOT NULL DEFAULT 'Open',
                    created_by_user_id  NVARCHAR(450)   NULL,
                    created_at          DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
                    updated_at          DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
                    CONSTRAINT FK_case_conferences_resident
                        FOREIGN KEY (resident_id) REFERENCES residents(resident_id)
                );
                CREATE INDEX IX_case_conferences_resident ON case_conferences(resident_id);
                CREATE INDEX IX_case_conferences_date     ON case_conferences(conference_date);
            END
        ");

        // Add new columns to intervention_plans (idempotent — each wrapped in IF NOT EXISTS).
        await db.Database.ExecuteSqlRawAsync(@"
            IF NOT EXISTS (
                SELECT 1 FROM sys.columns
                WHERE object_id = OBJECT_ID('intervention_plans') AND name = 'conference_id'
            )
            ALTER TABLE intervention_plans ADD conference_id INT NULL;
        ");
        await db.Database.ExecuteSqlRawAsync(@"
            IF NOT EXISTS (
                SELECT 1 FROM sys.columns
                WHERE object_id = OBJECT_ID('intervention_plans') AND name = 'priority'
            )
            ALTER TABLE intervention_plans ADD priority NVARCHAR(20) NULL;
        ");
        await db.Database.ExecuteSqlRawAsync(@"
            IF NOT EXISTS (
                SELECT 1 FROM sys.columns
                WHERE object_id = OBJECT_ID('intervention_plans') AND name = 'progress_notes'
            )
            ALTER TABLE intervention_plans ADD progress_notes NVARCHAR(MAX) NULL;
        ");
        await db.Database.ExecuteSqlRawAsync(@"
            IF NOT EXISTS (
                SELECT 1 FROM sys.columns
                WHERE object_id = OBJECT_ID('intervention_plans') AND name = 'assigned_to'
            )
            ALTER TABLE intervention_plans ADD assigned_to NVARCHAR(100) NULL;
        ");

        // Seed roles
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

        string[] roles = ["Admin", "Staff", "Donor"];
        foreach (var role in roles)
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                await roleManager.CreateAsync(new IdentityRole(role));
            }
        }

        // Seed a default admin user (change password after first login!)
        var adminEmail = builder.Configuration["SeedAdmin:Email"] ?? "admin@intex2026.org";
        var adminPassword = builder.Configuration["SeedAdmin:Password"] ?? "Admin123!@#Pass";
        var existingAdmin = await userManager.FindByEmailAsync(adminEmail);
        if (existingAdmin == null)
        {
            var adminUser = new ApplicationUser
            {
                UserName = adminEmail,
                Email = adminEmail,
                EmailConfirmed = true
                // Region and City are null → Company Manager level
            };
            var result = await userManager.CreateAsync(adminUser, adminPassword);
            if (result.Succeeded)
            {
                await userManager.AddToRoleAsync(adminUser, "Admin");
            }
        }

        // Seed the canonical four-tier test accounts (founder / regional /
        // location / staff / donor) from RoleSeeder. This is the source of
        // truth for region+city on those accounts — every startup the
        // seeder will *update* an existing user's Region and City to match
        // the values in TestUsers, so e.g. staff@ember.org is guaranteed to
        // point at Visayas / Cebu City (matching location@ember.org).
        //
        // Without this call the staff test account keeps whatever region/city
        // it happened to be created with, which is how the Staff Dashboard
        // ended up with no safehouse card — the account's City didn't match
        // any row in the safehouses table.
        await RoleSeeder.SeedAsync(scope.ServiceProvider);

        // Ensure donor@ember.org has a Supporters row so DonorPortal works
        var appDb = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        const string donorEmail = "donor@ember.org";
        if (!appDb.Supporters.Any(s => s.Email == donorEmail))
        {
            var maxId = appDb.Supporters.Any() ? appDb.Supporters.Max(s => s.SupporterId) : 0;
            appDb.Supporters.Add(new Supporter
            {
                SupporterId    = maxId + 1,
                Email          = donorEmail,
                FirstName      = "Test",
                LastName       = "Donor",
                SupporterType  = "MonetaryDonor",
                Status         = "Active",
            });
            await appDb.SaveChangesAsync();
            logger.LogInformation("Seeded supporter row for {Email}.", donorEmail);
        }

        // Ensure partners and partner_assignments tables exist.
        // These are in lighthouse_schema.sql but not in any EF Core migration,
        // so on a fresh Azure SQL database they may not exist yet.
        await appDb.Database.ExecuteSqlRawAsync(@"
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='partners' AND xtype='U')
            BEGIN
                CREATE TABLE partners (
                    partner_id      INT             PRIMARY KEY,
                    partner_name    NVARCHAR(200)   NOT NULL,
                    partner_type    NVARCHAR(50)    NOT NULL,
                    role_type       NVARCHAR(50)    NOT NULL,
                    contact_name    NVARCHAR(200)   NOT NULL DEFAULT '',
                    email           NVARCHAR(256)   NOT NULL DEFAULT '',
                    phone           NVARCHAR(30)    NULL,
                    region          NVARCHAR(100)   NOT NULL DEFAULT '',
                    status          NVARCHAR(20)    NOT NULL DEFAULT 'Active',
                    start_date      DATE            NULL,
                    end_date        DATE            NULL,
                    notes           NVARCHAR(MAX)   NULL
                );
            END
        ");
        await appDb.Database.ExecuteSqlRawAsync(@"
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='partner_assignments' AND xtype='U')
            BEGIN
                CREATE TABLE partner_assignments (
                    assignment_id           INT             PRIMARY KEY,
                    partner_id              INT             NOT NULL,
                    safehouse_id            INT             NOT NULL,
                    program_area            NVARCHAR(50)    NOT NULL,
                    assignment_start        DATE            NULL,
                    assignment_end          DATE            NULL,
                    responsibility_notes    NVARCHAR(MAX)   NULL,
                    is_primary              BIT             NOT NULL DEFAULT 0,
                    status                  NVARCHAR(20)    NOT NULL DEFAULT 'Active',
                    CONSTRAINT FK_partner_assignments_partner
                        FOREIGN KEY (partner_id) REFERENCES partners(partner_id),
                    CONSTRAINT FK_partner_assignments_safehouse
                        FOREIGN KEY (safehouse_id) REFERENCES safehouses(safehouse_id)
                );
                CREATE INDEX IX_partner_assignments_partner  ON partner_assignments(partner_id);
                CREATE INDEX IX_partner_assignments_safehouse ON partner_assignments(safehouse_id);
            END
        ");

        // Seed partners + partner_assignments if tables are empty.
        // These power the ML Insights Pipeline 07 (Partner Effectiveness) page.
        // Data is taken directly from lighthouse_csv_v7/partners.csv (30 rows)
        // and partner_assignments.csv (48 rows). Assignments with a NULL
        // safehouse_id in the source CSV are skipped because the FK is NOT NULL.
        if (!appDb.Partners.Any())
        {
            appDb.Partners.AddRange(
                new Partner { PartnerId=1,  PartnerName="Ana Reyes",     PartnerType="Organization", RoleType="SafehouseOps", ContactName="Ana Reyes",     Email="ana-reyes@hopepartners.ph",         Phone="+63 993 532 6574", Region="Luzon",    Status="Active",   StartDate=new DateTime(2022,1,1),  Notes="Primary contractor" },
                new Partner { PartnerId=2,  PartnerName="Maria Santos",  PartnerType="Individual",   RoleType="Evaluation",   ContactName="Maria Santos",  Email="maria-santos@pldt.net.ph",          Phone="+63 927 194 7224", Region="Luzon",    Status="Active",   StartDate=new DateTime(2022,1,21), Notes="Primary contractor" },
                new Partner { PartnerId=3,  PartnerName="Elena Cruz",    PartnerType="Individual",   RoleType="Education",    ContactName="Elena Cruz",    Email="elena-cruz@eastern.com.ph",         Phone="+63 966 926 1711", Region="Mindanao", Status="Active",   StartDate=new DateTime(2022,2,10), Notes="Primary contractor" },
                new Partner { PartnerId=4,  PartnerName="Sofia Dizon",   PartnerType="Organization", RoleType="Logistics",    ContactName="Sofia Dizon",   Email="sofia-dizon@bayanihanfoundation.ph", Phone="+63 947 400 6925", Region="Visayas",  Status="Active",   StartDate=new DateTime(2022,3,2),  Notes="Primary contractor" },
                new Partner { PartnerId=5,  PartnerName="Grace Flores",  PartnerType="Individual",   RoleType="SafehouseOps", ContactName="Grace Flores",  Email="grace-flores@yahoo.com.ph",         Phone="+63 991 333 5741", Region="Visayas",  Status="Active",   StartDate=new DateTime(2022,3,22), Notes="Primary contractor" },
                new Partner { PartnerId=6,  PartnerName="Joy Garcia",    PartnerType="Individual",   RoleType="Maintenance",  ContactName="Joy Garcia",    Email="joy-garcia@yahoo.com.ph",           Phone="+63 995 384 8428", Region="Mindanao", Status="Active",   StartDate=new DateTime(2022,4,11), Notes="Primary contractor" },
                new Partner { PartnerId=7,  PartnerName="Lina Mendoza",  PartnerType="Organization", RoleType="FindSafehouse",ContactName="Lina Mendoza",  Email="lina-mendoza@unityalliance.ph",     Phone="+63 955 786 5374", Region="Luzon",    Status="Active",   StartDate=new DateTime(2022,5,1),  Notes="Primary contractor" },
                new Partner { PartnerId=8,  PartnerName="Noel Torres",   PartnerType="Individual",   RoleType="Logistics",    ContactName="Noel Torres",   Email="noel-torres@yahoo.com.ph",          Phone="+63 951 750 3803", Region="Visayas",  Status="Active",   StartDate=new DateTime(2022,5,21), Notes="Primary contractor" },
                new Partner { PartnerId=9,  PartnerName="Mark Lopez",    PartnerType="Individual",   RoleType="SafehouseOps", ContactName="Mark Lopez",    Email="mark-lopez@smart.com.ph",           Phone="+63 995 376 4598", Region="Luzon",    Status="Active",   StartDate=new DateTime(2022,6,10), Notes="Primary contractor" },
                new Partner { PartnerId=10, PartnerName="Ramon Bautista", PartnerType="Organization",RoleType="Logistics",    ContactName="Ramon Bautista",Email="ramon-bautista@hopepartners.ph",    Phone="+63 915 924 6168", Region="Mindanao", Status="Active",   StartDate=new DateTime(2022,6,30), Notes="Primary contractor" },
                new Partner { PartnerId=11, PartnerName="Paolo Navarro", PartnerType="Individual",   RoleType="SafehouseOps", ContactName="Paolo Navarro", Email="paolo-navarro@eastern.com.ph",      Phone="+63 977 317 9179", Region="Luzon",    Status="Active",   StartDate=new DateTime(2022,7,20), Notes="Secondary contractor" },
                new Partner { PartnerId=12, PartnerName="Jessa Ramos",   PartnerType="Individual",   RoleType="SafehouseOps", ContactName="Jessa Ramos",   Email="jessa-ramos@smart.com.ph",          Phone="+63 937 371 3287", Region="Mindanao", Status="Active",   StartDate=new DateTime(2022,8,9),  Notes="Secondary contractor" },
                new Partner { PartnerId=13, PartnerName="Mica Castillo", PartnerType="Organization", RoleType="Evaluation",   ContactName="Mica Castillo", Email="mica-castillo@faithgroup.ph",       Phone="+63 949 508 6930", Region="Visayas",  Status="Active",   StartDate=new DateTime(2022,8,29), Notes="Secondary contractor" },
                new Partner { PartnerId=14, PartnerName="Leah Gomez",    PartnerType="Individual",   RoleType="Education",    ContactName="Leah Gomez",    Email="leah-gomez@eastern.com.ph",         Phone="+63 928 193 1771", Region="Mindanao", Status="Active",   StartDate=new DateTime(2022,9,18), Notes="Secondary contractor" },
                new Partner { PartnerId=15, PartnerName="Ruth Naval",    PartnerType="Individual",   RoleType="Transport",    ContactName="Ruth Naval",    Email="ruth-naval@globe.com.ph",           Phone="+63 992 532 2040", Region="Luzon",    Status="Active",   StartDate=new DateTime(2022,10,8), Notes="Secondary contractor" },
                new Partner { PartnerId=16, PartnerName="Ivan Pascual",  PartnerType="Organization", RoleType="SafehouseOps", ContactName="Ivan Pascual",  Email="ivan-pascual@kapatiranalliance.ph", Phone="+63 947 981 1188", Region="Visayas",  Status="Active",   StartDate=new DateTime(2022,10,28),Notes="Secondary contractor" },
                new Partner { PartnerId=17, PartnerName="Aiko Rivera",   PartnerType="Individual",   RoleType="Logistics",    ContactName="Aiko Rivera",   Email="aiko-rivera@eastern.com.ph",        Phone="+63 967 887 6573", Region="Luzon",    Status="Active",   StartDate=new DateTime(2022,11,17),Notes="Secondary contractor" },
                new Partner { PartnerId=18, PartnerName="Mara Salazar",  PartnerType="Individual",   RoleType="Education",    ContactName="Mara Salazar",  Email="mara-salazar@smart.com.ph",         Phone="+63 905 839 5315", Region="Luzon",    Status="Active",   StartDate=new DateTime(2022,12,7), Notes="Secondary contractor" },
                new Partner { PartnerId=19, PartnerName="Paula Tan",     PartnerType="Organization", RoleType="Maintenance",  ContactName="Paula Tan",     Email="paula-tan@brightalliance.ph",       Phone="+63 998 619 4258", Region="Mindanao", Status="Active",   StartDate=new DateTime(2022,12,27),Notes="Secondary contractor" },
                new Partner { PartnerId=20, PartnerName="Chris Uy",      PartnerType="Individual",   RoleType="Education",    ContactName="Chris Uy",      Email="chris-uy@eastern.com.ph",           Phone="+63 939 100 6310", Region="Mindanao", Status="Active",   StartDate=new DateTime(2023,1,16), Notes="Secondary contractor" },
                new Partner { PartnerId=21, PartnerName="Ben Diaz",      PartnerType="Individual",   RoleType="SafehouseOps", ContactName="Ben Diaz",      Email="ben-diaz@pldt.net.ph",              Phone="+63 976 345 1949", Region="Luzon",    Status="Active",   StartDate=new DateTime(2023,2,5),  Notes="Secondary contractor" },
                new Partner { PartnerId=22, PartnerName="Kai Javier",    PartnerType="Organization", RoleType="Evaluation",   ContactName="Kai Javier",    Email="kai-javier@brightfoundation.ph",    Phone="+63 928 935 2133", Region="Visayas",  Status="Active",   StartDate=new DateTime(2023,2,25), Notes="Secondary contractor" },
                new Partner { PartnerId=23, PartnerName="Tess Lim",      PartnerType="Individual",   RoleType="Maintenance",  ContactName="Tess Lim",      Email="tess-lim@globe.com.ph",             Phone="+63 936 775 8787", Region="Visayas",  Status="Active",   StartDate=new DateTime(2023,3,17), Notes="Secondary contractor" },
                new Partner { PartnerId=24, PartnerName="Nina Vega",     PartnerType="Individual",   RoleType="Maintenance",  ContactName="Nina Vega",     Email="nina-vega@eastern.com.ph",          Phone="+63 951 533 4470", Region="Luzon",    Status="Active",   StartDate=new DateTime(2023,4,6),  Notes="Secondary contractor" },
                new Partner { PartnerId=25, PartnerName="Rico Ramos",    PartnerType="Organization", RoleType="Maintenance",  ContactName="Rico Ramos",    Email="rico-ramos@globalalliance.ph",      Phone="+63 996 787 7118", Region="Mindanao", Status="Active",   StartDate=new DateTime(2023,4,26), Notes="Secondary contractor" },
                new Partner { PartnerId=26, PartnerName="Maya Serrano",  PartnerType="Individual",   RoleType="SafehouseOps", ContactName="Maya Serrano",  Email="maya-serrano@yahoo.com.ph",         Phone="+63 965 330 2049", Region="Visayas",  Status="Active",   StartDate=new DateTime(2023,5,16), Notes="Secondary contractor" },
                new Partner { PartnerId=27, PartnerName="Ivy Valdez",    PartnerType="Individual",   RoleType="Evaluation",   ContactName="Ivy Valdez",    Email="ivy-valdez@globe.com.ph",           Phone="+63 949 325 1117", Region="Visayas",  Status="Active",   StartDate=new DateTime(2023,6,5),  Notes="Secondary contractor" },
                new Partner { PartnerId=28, PartnerName="Paul Yap",      PartnerType="Organization", RoleType="Education",    ContactName="Paul Yap",      Email="paul-yap@globalfoundation.ph",      Phone="+63 915 980 6413", Region="Visayas",  Status="Inactive", StartDate=new DateTime(2023,6,25), EndDate=new DateTime(2025,12,31), Notes="Secondary contractor" },
                new Partner { PartnerId=29, PartnerName="June Cortez",   PartnerType="Individual",   RoleType="Education",    ContactName="June Cortez",   Email="june-cortez@smart.com.ph",          Phone="+63 955 652 3167", Region="Luzon",    Status="Inactive", StartDate=new DateTime(2023,7,15), EndDate=new DateTime(2025,12,31), Notes="Secondary contractor" },
                new Partner { PartnerId=30, PartnerName="Lara Soriano",  PartnerType="Individual",   RoleType="Logistics",    ContactName="Lara Soriano",  Email="lara-soriano@eastern.com.ph",       Phone="+63 921 348 8749", Region="Mindanao", Status="Inactive", StartDate=new DateTime(2023,8,4),  EndDate=new DateTime(2025,12,31), Notes="Secondary contractor" }
            );
            await appDb.SaveChangesAsync();
            logger.LogInformation("Seeded 30 partner rows.");
        }

        if (!appDb.PartnerAssignments.Any())
        {
            // Rows with null safehouse_id in the CSV are omitted (schema requires NOT NULL).
            appDb.PartnerAssignments.AddRange(
                new PartnerAssignment { AssignmentId=1,  PartnerId=1,  SafehouseId=8, ProgramArea="Operations", AssignmentStart=new DateTime(2022,1,1),  IsPrimary=true,  Status="Active", ResponsibilityNotes="SafehouseOps support for safehouse operations" },
                new PartnerAssignment { AssignmentId=2,  PartnerId=1,  SafehouseId=9, ProgramArea="Operations", AssignmentStart=new DateTime(2022,1,1),  IsPrimary=false, Status="Active", ResponsibilityNotes="SafehouseOps support for safehouse operations" },
                new PartnerAssignment { AssignmentId=3,  PartnerId=2,  SafehouseId=4, ProgramArea="Wellbeing",  AssignmentStart=new DateTime(2022,1,21), IsPrimary=true,  Status="Active", ResponsibilityNotes="Evaluation support for safehouse operations" },
                new PartnerAssignment { AssignmentId=4,  PartnerId=3,  SafehouseId=9, ProgramArea="Education",  AssignmentStart=new DateTime(2022,2,10), IsPrimary=true,  Status="Active", ResponsibilityNotes="Education support for safehouse operations" },
                new PartnerAssignment { AssignmentId=5,  PartnerId=3,  SafehouseId=6, ProgramArea="Education",  AssignmentStart=new DateTime(2022,2,10), IsPrimary=false, Status="Active", ResponsibilityNotes="Education support for safehouse operations" },
                new PartnerAssignment { AssignmentId=6,  PartnerId=4,  SafehouseId=8, ProgramArea="Transport",  AssignmentStart=new DateTime(2022,3,2),  IsPrimary=true,  Status="Active", ResponsibilityNotes="Logistics support for safehouse operations" },
                new PartnerAssignment { AssignmentId=7,  PartnerId=5,  SafehouseId=2, ProgramArea="Operations", AssignmentStart=new DateTime(2022,3,22), IsPrimary=true,  Status="Active", ResponsibilityNotes="SafehouseOps support for safehouse operations" },
                // row 8: safehouse_id null — skipped
                new PartnerAssignment { AssignmentId=9,  PartnerId=7,  SafehouseId=8, ProgramArea="Operations", AssignmentStart=new DateTime(2022,5,1),  IsPrimary=true,  Status="Active", ResponsibilityNotes="FindSafehouse support for safehouse operations" },
                // row 10: safehouse_id null — skipped
                // row 11: safehouse_id null — skipped
                new PartnerAssignment { AssignmentId=12, PartnerId=9,  SafehouseId=6, ProgramArea="Operations", AssignmentStart=new DateTime(2022,6,10), IsPrimary=true,  Status="Active", ResponsibilityNotes="SafehouseOps support for safehouse operations" },
                new PartnerAssignment { AssignmentId=13, PartnerId=9,  SafehouseId=3, ProgramArea="Operations", AssignmentStart=new DateTime(2022,6,10), IsPrimary=false, Status="Active", ResponsibilityNotes="SafehouseOps support for safehouse operations" },
                // row 14: safehouse_id null — skipped
                new PartnerAssignment { AssignmentId=15, PartnerId=11, SafehouseId=3, ProgramArea="Operations", AssignmentStart=new DateTime(2022,7,20), IsPrimary=true,  Status="Active", ResponsibilityNotes="SafehouseOps support for safehouse operations" },
                new PartnerAssignment { AssignmentId=16, PartnerId=11, SafehouseId=8, ProgramArea="Operations", AssignmentStart=new DateTime(2022,7,20), IsPrimary=false, Status="Active", ResponsibilityNotes="SafehouseOps support for safehouse operations" },
                new PartnerAssignment { AssignmentId=17, PartnerId=12, SafehouseId=8, ProgramArea="Operations", AssignmentStart=new DateTime(2022,8,9),  IsPrimary=true,  Status="Active", ResponsibilityNotes="SafehouseOps support for safehouse operations" },
                new PartnerAssignment { AssignmentId=18, PartnerId=13, SafehouseId=1, ProgramArea="Wellbeing",  AssignmentStart=new DateTime(2022,8,29), IsPrimary=true,  Status="Active", ResponsibilityNotes="Evaluation support for safehouse operations" },
                new PartnerAssignment { AssignmentId=19, PartnerId=14, SafehouseId=2, ProgramArea="Education",  AssignmentStart=new DateTime(2022,9,18), IsPrimary=true,  Status="Active", ResponsibilityNotes="Education support for safehouse operations" },
                new PartnerAssignment { AssignmentId=20, PartnerId=14, SafehouseId=7, ProgramArea="Education",  AssignmentStart=new DateTime(2022,9,18), IsPrimary=false, Status="Active", ResponsibilityNotes="Education support for safehouse operations" },
                // row 21: safehouse_id null — skipped
                new PartnerAssignment { AssignmentId=22, PartnerId=15, SafehouseId=2, ProgramArea="Transport",  AssignmentStart=new DateTime(2022,10,8), IsPrimary=false, Status="Active", ResponsibilityNotes="Transport support for safehouse operations" },
                new PartnerAssignment { AssignmentId=23, PartnerId=16, SafehouseId=4, ProgramArea="Operations", AssignmentStart=new DateTime(2022,10,28),IsPrimary=true,  Status="Active", ResponsibilityNotes="SafehouseOps support for safehouse operations" },
                new PartnerAssignment { AssignmentId=24, PartnerId=16, SafehouseId=7, ProgramArea="Operations", AssignmentStart=new DateTime(2022,10,28),IsPrimary=false, Status="Active", ResponsibilityNotes="SafehouseOps support for safehouse operations" },
                // row 25: safehouse_id null — skipped
                new PartnerAssignment { AssignmentId=26, PartnerId=17, SafehouseId=1, ProgramArea="Transport",  AssignmentStart=new DateTime(2022,11,17),IsPrimary=false, Status="Active", ResponsibilityNotes="Logistics support for safehouse operations" },
                new PartnerAssignment { AssignmentId=27, PartnerId=17, SafehouseId=9, ProgramArea="Transport",  AssignmentStart=new DateTime(2022,11,17),IsPrimary=false, Status="Active", ResponsibilityNotes="Logistics support for safehouse operations" },
                new PartnerAssignment { AssignmentId=28, PartnerId=18, SafehouseId=2, ProgramArea="Education",  AssignmentStart=new DateTime(2022,12,7), IsPrimary=true,  Status="Active", ResponsibilityNotes="Education support for safehouse operations" },
                new PartnerAssignment { AssignmentId=29, PartnerId=18, SafehouseId=3, ProgramArea="Education",  AssignmentStart=new DateTime(2022,12,7), IsPrimary=false, Status="Active", ResponsibilityNotes="Education support for safehouse operations" },
                new PartnerAssignment { AssignmentId=30, PartnerId=19, SafehouseId=7, ProgramArea="Maintenance",AssignmentStart=new DateTime(2022,12,27),IsPrimary=true,  Status="Active", ResponsibilityNotes="Maintenance support for safehouse operations" },
                new PartnerAssignment { AssignmentId=31, PartnerId=20, SafehouseId=4, ProgramArea="Education",  AssignmentStart=new DateTime(2023,1,16), IsPrimary=true,  Status="Active", ResponsibilityNotes="Education support for safehouse operations" },
                new PartnerAssignment { AssignmentId=32, PartnerId=20, SafehouseId=5, ProgramArea="Education",  AssignmentStart=new DateTime(2023,1,16), IsPrimary=false, Status="Active", ResponsibilityNotes="Education support for safehouse operations" },
                // row 33: safehouse_id null — skipped
                new PartnerAssignment { AssignmentId=34, PartnerId=22, SafehouseId=4, ProgramArea="Wellbeing",  AssignmentStart=new DateTime(2023,2,25), IsPrimary=true,  Status="Active", ResponsibilityNotes="Evaluation support for safehouse operations" },
                new PartnerAssignment { AssignmentId=35, PartnerId=22, SafehouseId=7, ProgramArea="Wellbeing",  AssignmentStart=new DateTime(2023,2,25), IsPrimary=false, Status="Active", ResponsibilityNotes="Evaluation support for safehouse operations" },
                // row 36: safehouse_id null — skipped
                new PartnerAssignment { AssignmentId=37, PartnerId=24, SafehouseId=3, ProgramArea="Maintenance",AssignmentStart=new DateTime(2023,4,6),  IsPrimary=true,  Status="Active", ResponsibilityNotes="Maintenance support for safehouse operations" },
                new PartnerAssignment { AssignmentId=38, PartnerId=25, SafehouseId=5, ProgramArea="Maintenance",AssignmentStart=new DateTime(2023,4,26), IsPrimary=true,  Status="Active", ResponsibilityNotes="Maintenance support for safehouse operations" },
                new PartnerAssignment { AssignmentId=39, PartnerId=25, SafehouseId=8, ProgramArea="Maintenance",AssignmentStart=new DateTime(2023,4,26), IsPrimary=false, Status="Active", ResponsibilityNotes="Maintenance support for safehouse operations" },
                new PartnerAssignment { AssignmentId=40, PartnerId=26, SafehouseId=9, ProgramArea="Operations", AssignmentStart=new DateTime(2023,5,16), IsPrimary=true,  Status="Active", ResponsibilityNotes="SafehouseOps support for safehouse operations" },
                new PartnerAssignment { AssignmentId=41, PartnerId=26, SafehouseId=8, ProgramArea="Operations", AssignmentStart=new DateTime(2023,5,16), IsPrimary=false, Status="Active", ResponsibilityNotes="SafehouseOps support for safehouse operations" },
                new PartnerAssignment { AssignmentId=42, PartnerId=26, SafehouseId=4, ProgramArea="Operations", AssignmentStart=new DateTime(2023,5,16), IsPrimary=false, Status="Active", ResponsibilityNotes="SafehouseOps support for safehouse operations" },
                new PartnerAssignment { AssignmentId=43, PartnerId=27, SafehouseId=5, ProgramArea="Wellbeing",  AssignmentStart=new DateTime(2023,6,5),  IsPrimary=true,  Status="Active", ResponsibilityNotes="Evaluation support for safehouse operations" },
                // row 44: safehouse_id null — skipped
                new PartnerAssignment { AssignmentId=45, PartnerId=29, SafehouseId=1, ProgramArea="Education",  AssignmentStart=new DateTime(2023,7,15), AssignmentEnd=new DateTime(2025,12,31), IsPrimary=true,  Status="Ended", ResponsibilityNotes="Education support for safehouse operations" },
                new PartnerAssignment { AssignmentId=46, PartnerId=29, SafehouseId=3, ProgramArea="Education",  AssignmentStart=new DateTime(2023,7,15), AssignmentEnd=new DateTime(2025,12,31), IsPrimary=false, Status="Ended", ResponsibilityNotes="Education support for safehouse operations" },
                // row 47: safehouse_id null — skipped
                new PartnerAssignment { AssignmentId=48, PartnerId=30, SafehouseId=8, ProgramArea="Transport",  AssignmentStart=new DateTime(2023,8,4),  AssignmentEnd=new DateTime(2025,12,31), IsPrimary=false, Status="Ended", ResponsibilityNotes="Logistics support for safehouse operations" }
            );
            await appDb.SaveChangesAsync();
            logger.LogInformation("Seeded 38 partner_assignment rows (10 skipped: null safehouse_id).");
        }

        logger.LogInformation("Database seeding completed.");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "An error occurred while migrating/seeding the database. The app will continue starting.");
    }
}

// ---------- Middleware ----------
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHsts();
app.UseHttpsRedirection();

// Content-Security-Policy header (IS 414 requirement)
app.Use(async (context, next) =>
{
    context.Response.Headers.Append(
        "Content-Security-Policy",
        "default-src 'self'; " +
        "script-src 'self'; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "img-src 'self' data: blob: https://*.basemaps.cartocdn.com https://*.tile.openstreetmap.org https://unpkg.com; " +
        "connect-src 'self' https://*.basemaps.cartocdn.com;");
    await next();
});

app.UseCors("AppCors");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();



// One-time backfill: reconcile every safehouse's current_occupancy with the
// live count of Active residents. The canonical schema ships with stale
// values in current_occupancy (the seed CSVs were authored before the
// residents table was populated), so on every cold start we walk the table
// and sync. From this point forward the ResidentsController keeps the
// column in sync on every insert/update/delete.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<Intex2026.Api.Data.AppDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    try
    {
        var counts = await db.Residents
            .Where(r => r.CaseStatus == "Active")
            .GroupBy(r => r.SafehouseId)
            .Select(g => new { SafehouseId = g.Key, Count = g.Count() })
            .ToListAsync();

        var countMap = counts.ToDictionary(x => x.SafehouseId, x => x.Count);
        var safehouses = await db.Safehouses.ToListAsync();
        var changed = 0;
        foreach (var sh in safehouses)
        {
            var live = countMap.TryGetValue(sh.SafehouseId, out var c) ? c : 0;
            if (sh.CurrentOccupancy != live)
            {
                sh.CurrentOccupancy = live;
                changed++;
            }
        }
        if (changed > 0)
        {
            await db.SaveChangesAsync();
            logger.LogInformation("Occupancy backfill: reconciled {Count} safehouse rows.", changed);
        }
    }
    catch (Exception ex)
    {
        logger.LogWarning(ex, "Occupancy backfill failed (non-fatal).");
    }
}

app.Run();
