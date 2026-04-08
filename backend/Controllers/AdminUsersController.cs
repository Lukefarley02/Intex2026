using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Intex2026.Api.Authorization;
using Intex2026.Api.Data;

namespace Intex2026.Api.Controllers;

/// <summary>
/// Admin user management. Lists every account in the ASP.NET Identity
/// store along with their roles and organizational scope.
///
/// Read access:  any Admin (founder, regional, or location manager) — but
///               regional and location managers only see users whose scope
///               is contained inside their own.
/// Write access: founders only (creating a new manager is a structural
///               operation a city-level admin should not perform).
/// </summary>
[ApiController]
[Route("api/adminusers")]
[Authorize(Roles = "Admin")]
public class AdminUsersController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;

    public AdminUsersController(UserManager<ApplicationUser> userManager)
    {
        _userManager = userManager;
    }

    // GET /api/adminusers
    [HttpGet]
    public async Task<IActionResult> GetUsers()
    {
        var caller = await UserScope.FromPrincipalAsync(User, _userManager);
        var users = _userManager.Users.ToList();
        var result = new List<object>(users.Count);

        foreach (var u in users)
        {
            var roles = await _userManager.GetRolesAsync(u);

            // Hide users that fall outside the caller's scope.
            if (!caller.IsFounder)
            {
                if (caller.Level == UserScope.ScopeLevel.RegionalManager)
                {
                    if (!string.Equals(u.Region, caller.Region, StringComparison.OrdinalIgnoreCase))
                        continue;
                }
                else if (caller.Level == UserScope.ScopeLevel.LocationManager)
                {
                    if (!string.Equals(u.City, caller.City, StringComparison.OrdinalIgnoreCase))
                        continue;
                }
            }

            // Derive admin scope label from Region/City for convenience
            string? adminScope = null;
            if (roles.Contains("Admin"))
            {
                adminScope = u.Region == null ? "founder"
                           : u.City == null   ? "region"
                                              : "location";
            }

            result.Add(new
            {
                id = u.Id,
                email = u.Email,
                emailConfirmed = u.EmailConfirmed,
                lockedOut = u.LockoutEnd.HasValue && u.LockoutEnd > DateTimeOffset.UtcNow,
                roles,
                region = u.Region,
                city = u.City,
                adminScope
            });
        }

        return Ok(result);
    }

    // PUT /api/adminusers/{id}/scope
    // Update a user's region and city (changes their admin scope).
    // Founder-only — only the company-level admin can move people between
    // tiers, regions, or locations.
    [HttpPut("{id}/scope")]
    public async Task<IActionResult> UpdateScope(string id, [FromBody] UpdateScopeRequest request)
    {
        var caller = await UserScope.FromPrincipalAsync(User, _userManager);
        if (!caller.IsFounder) return Forbid();

        var user = await _userManager.FindByIdAsync(id);
        if (user == null) return NotFound();

        user.Region = string.IsNullOrWhiteSpace(request.Region) ? null : request.Region.Trim();
        user.City   = string.IsNullOrWhiteSpace(request.City)   ? null : request.City.Trim();

        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded) return BadRequest(result.Errors);

        return Ok(new { message = "Scope updated.", region = user.Region, city = user.City });
    }
}

public record UpdateScopeRequest(string? Region, string? City);
