using Microsoft.AspNetCore.Identity;

namespace Intex2026.Api.Data;

public static class RoleSeeder
{
    private static readonly string[] Roles = ["Admin", "Staff", "Donor"];

    // Test users: (email, password, roles[], region?, city?)
    //
    // Scope derivation (see UserScope.cs):
    //   Admin + Region null + City null  → Founder          (sees everything)
    //   Admin + Region set  + City null  → Regional Manager (everything in their region)
    //   Admin + Region set  + City set   → Location Manager (one city only)
    //   Staff + Region set  + City set   → Staff            (city only, no monetary donors, no notesRestricted)
    //   Donor                            → Donor            (only /api/donorportal/me*)
    //
    // All five tiers are seeded here so you can log in as each one and
    // verify the four-tier access control end-to-end. Passwords all satisfy
    // the hardened policy (length ≥ 12, upper, lower, digit, non-alphanumeric).
    private static readonly (string Email, string Password, string[] Roles, string? Region, string? City)[] TestUsers =
    [
        // Region / City values match the real safehouse seed data:
        //   Luzon    → Quezon City, Baguio City
        //   Visayas  → Cebu City, Iloilo City, Bacolod, Tacloban
        //   Mindanao → Davao City, Cagayan de Oro, General Santos
        // Visayas is used for regional@ember.org because it has 4 safehouses — the
        // richest region for exercising the Regional Manager scope filter.
        ("admin@ember.org",    "AdminEmber2026!",    ["Admin", "Donor"], null,       null),         // Founder (company-wide)
        ("regional@ember.org", "RegionalEmber2026!", ["Admin", "Donor"], "Visayas",  null),         // Regional Manager — all 4 Visayas safehouses
        ("location@ember.org", "LocationEmber2026!", ["Admin", "Donor"], "Visayas",  "Cebu City"),  // Location Manager — Cebu City only
        ("staff@ember.org",    "StaffEmber2026!",    ["Staff", "Donor"], "Visayas",  "Cebu City"),  // Staff — same city as Location Manager for side-by-side testing
        ("donor@ember.org",    "DonorEmber2026!",    ["Donor"],          null,       null),         // Donor (region ignored)
    ];

    public static async Task SeedAsync(IServiceProvider services)
    {
        var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
        var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();

        // Create roles if they don't exist
        foreach (var role in Roles)
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole(role));
        }

        // Create or update test users
        foreach (var (email, password, roles, region, city) in TestUsers)
        {
            var user = await userManager.FindByEmailAsync(email);
            if (user is null)
            {
                user = new ApplicationUser
                {
                    UserName = email,
                    Email = email,
                    EmailConfirmed = true,
                    Region = region,
                    City = city
                };
                var result = await userManager.CreateAsync(user, password);
                if (!result.Succeeded) continue;
            }
            else
            {
                // Update region/city in case they changed
                user.Region = region;
                user.City = city;
                await userManager.UpdateAsync(user);
            }

            // Idempotently assign roles
            var currentRoles = await userManager.GetRolesAsync(user);
            foreach (var role in roles)
            {
                if (!currentRoles.Contains(role))
                    await userManager.AddToRoleAsync(user, role);
            }
        }
    }
}
