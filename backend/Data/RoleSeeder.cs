using Microsoft.AspNetCore.Identity;

namespace Intex2026.Api.Data;

public static class RoleSeeder
{
    private static readonly string[] Roles = ["Admin", "Staff", "Donor"];

    // Test users: (email, password, roles[], region?, city?)
    // Region/City null = company-level admin; region only = regional; both = location manager
    private static readonly (string Email, string Password, string[] Roles, string? Region, string? City)[] TestUsers =
    [
        ("admin@ember.org",  "AdminEmber2026!", ["Admin", "Donor"], null,       null),   // Company Manager
        ("staff@ember.org",  "StaffEmber2026!", ["Staff", "Donor"], "West",    "Salem"), // Location-scoped staff
        ("donor@ember.org",  "DonorEmber2026!", ["Donor"],          null,       null),   // Donor (region ignored)
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
