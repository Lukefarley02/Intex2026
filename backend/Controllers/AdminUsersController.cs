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

    // POST /api/adminusers
    // Create a new user with a given role. Founder-only.
    [HttpPost]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
    {
        var caller = await UserScope.FromPrincipalAsync(User, _userManager);
        if (!caller.IsFounder) return Forbid();

        var allowed = new[] { "Admin", "Staff", "Donor" };
        if (!allowed.Contains(request.Role))
            return BadRequest(new { message = "Role must be Admin, Staff, or Donor." });

        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            EmailConfirmed = true,
            Region = string.IsNullOrWhiteSpace(request.Region) ? null : request.Region.Trim(),
            City   = string.IsNullOrWhiteSpace(request.City)   ? null : request.City.Trim(),
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            return BadRequest(new { errors = result.Errors.Select(e => e.Description) });

        await _userManager.AddToRoleAsync(user, request.Role);

        return Ok(new { id = user.Id, email = user.Email, role = request.Role });
    }

    // PUT /api/adminusers/{id}
    // Update a user's email and role. Founder-only.
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateUser(string id, [FromBody] UpdateUserRequest request)
    {
        var caller = await UserScope.FromPrincipalAsync(User, _userManager);
        if (!caller.IsFounder) return Forbid();

        var user = await _userManager.FindByIdAsync(id);
        if (user == null) return NotFound();

        // Update email
        if (!string.IsNullOrWhiteSpace(request.Email) &&
            !string.Equals(user.Email, request.Email, StringComparison.OrdinalIgnoreCase))
        {
            user.Email = request.Email.Trim();
            user.UserName = request.Email.Trim();
            user.NormalizedEmail = request.Email.Trim().ToUpperInvariant();
            user.NormalizedUserName = request.Email.Trim().ToUpperInvariant();
        }

        var updateResult = await _userManager.UpdateAsync(user);
        if (!updateResult.Succeeded)
            return BadRequest(new { errors = updateResult.Errors.Select(e => e.Description) });

        // Update password if provided
        if (!string.IsNullOrWhiteSpace(request.NewPassword))
        {
            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            var pwResult = await _userManager.ResetPasswordAsync(user, token, request.NewPassword);
            if (!pwResult.Succeeded)
                return BadRequest(new { errors = pwResult.Errors.Select(e => e.Description) });
        }

        // Update role
        var allowed = new[] { "Admin", "Staff", "Donor" };
        if (!string.IsNullOrWhiteSpace(request.Role) && allowed.Contains(request.Role))
        {
            var currentRoles = await _userManager.GetRolesAsync(user);
            if (!currentRoles.SequenceEqual(new[] { request.Role }))
            {
                await _userManager.RemoveFromRolesAsync(user, currentRoles);
                await _userManager.AddToRoleAsync(user, request.Role);
                // Invalidate any existing JWT for this user so the new role
                // takes effect immediately on their next request.
                await _userManager.UpdateSecurityStampAsync(user);
            }
        }

        return Ok(new { id = user.Id, email = user.Email, role = request.Role });
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
public record UpdateUserRequest(string Email, string Role, string? NewPassword = null);
public record CreateUserRequest(string Email, string Password, string Role, string? Region = null, string? City = null);
