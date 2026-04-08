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
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

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
    options.Password.RequiredLength = 12;
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
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self';");
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
