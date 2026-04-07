using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
<<<<<<< HEAD
using Microsoft.OpenApi.Models;
=======
>>>>>>> b896bfea2bd812da95f6cc6a7983738cab0ea8c6
using Intex2026.Api.Data;

var builder = WebApplication.CreateBuilder(args);

// ---------- Services ----------

<<<<<<< HEAD
// EF Core — application database
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// EF Core — identity database
builder.Services.AddDbContext<IdentityContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("IdentityConnection")));

// ASP.NET Identity
builder.Services.AddIdentity<IdentityUser, IdentityRole>(options =>
{
=======
// EF Core
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// ASP.NET Identity
builder.Services.AddIdentity<IdentityUser, IdentityRole>(options =>
{
    // Password policy — IS 414 requires EXCEEDING defaults
    // Defaults: MinLength=6, RequireDigit=true, RequireLowercase=true,
    //           RequireUppercase=true, RequireNonAlphanumeric=true
    options.Password.RequiredLength = 12;
    options.Password.RequiredUniqueChars = 3;
>>>>>>> b896bfea2bd812da95f6cc6a7983738cab0ea8c6
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = true;
    options.Password.RequireNonAlphanumeric = true;
<<<<<<< HEAD
    options.Password.RequiredLength = 12;
    options.Password.RequiredUniqueChars = 6;
})
.AddEntityFrameworkStores<IdentityContext>()
.AddDefaultTokenProviders();

// JWT Authentication
=======

    // Lockout
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.AllowedForNewUsers = true;

    // User
    options.User.RequireUniqueEmail = true;
})
.AddEntityFrameworkStores<AppDbContext>()
.AddDefaultTokenProviders();

// JWT Authentication
// IMPORTANT: This must come AFTER AddIdentity so it overrides Identity's
// default cookie-based schemes with JWT Bearer.
var jwtSettings = builder.Configuration.GetSection("Jwt");
var secretKey = jwtSettings["SecretKey"]
    ?? throw new InvalidOperationException("JWT SecretKey is not configured.");

>>>>>>> b896bfea2bd812da95f6cc6a7983738cab0ea8c6
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
<<<<<<< HEAD
=======
    options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
>>>>>>> b896bfea2bd812da95f6cc6a7983738cab0ea8c6
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
<<<<<<< HEAD
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
    };
});

builder.Services.AddAuthorization();
=======
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
        ClockSkew = TimeSpan.Zero  // No tolerance for expired tokens
    };
});
>>>>>>> b896bfea2bd812da95f6cc6a7983738cab0ea8c6

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

// CORS — allow Vite dev server during development
builder.Services.AddCors(options =>
{
    options.AddPolicy("DevCors", policy =>
        policy.WithOrigins("http://localhost:5173")
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

        // Seed roles
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<IdentityUser>>();

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
            var adminUser = new IdentityUser
            {
                UserName = adminEmail,
                Email = adminEmail,
                EmailConfirmed = true
            };
            var result = await userManager.CreateAsync(adminUser, adminPassword);
            if (result.Succeeded)
            {
                await userManager.AddToRoleAsync(adminUser, "Admin");
            }
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

app.UseHttpsRedirection();

// Content-Security-Policy header (IS 414 requirement)
app.Use(async (context, next) =>
{
    context.Response.Headers.Append(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self';");
    await next();
});

app.UseCors("DevCors");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Seed roles and test users on startup
using (var scope = app.Services.CreateScope())
{
    await RoleSeeder.SeedAsync(scope.ServiceProvider);
}

app.Run();
