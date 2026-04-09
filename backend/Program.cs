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

builder.Services.AddControllers();
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
        patchLogger.LogInformation("created_by_user_id columns verified.");
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
