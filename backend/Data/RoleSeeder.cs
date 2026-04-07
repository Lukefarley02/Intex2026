using Microsoft.AspNetCore.Identity;

namespace Intex2026.Api.Data;

public static class RoleSeeder
{
    private static readonly string[] Roles = ["Admin", "Staff", "Donor"];

    private static readonly (string Email, string Password, string[] Roles)[] TestUsers =
    [
        ("admin@ember.org",  "AdminEmber2026!", ["Admin", "Donor"]),
        ("staff@ember.org",  "StaffEmber2026!", ["Staff", "Donor"]),
        ("donor@ember.org",  "DonorEmber2026!", ["Donor"]),
    ];

    public static async Task SeedAsync(IServiceProvider services)
    {
        var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
        var userManager = services.GetRequiredService<UserManager<IdentityUser>>();

        // Create roles if they don't exist
        foreach (var role in Roles)
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole(role));
        }

        // Create test users if they don't exist
        foreach (var (email, password, roles) in TestUsers)
        {
            if (await userManager.FindByEmailAsync(email) is not null)
                continue;

            var user = new IdentityUser { UserName = email, Email = email, EmailConfirmed = true };
            var result = await userManager.CreateAsync(user, password);

            if (result.Succeeded)
                await userManager.AddToRolesAsync(user, roles);
        }
    }
}
