using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Intex2026.Api.Controllers;

/// <summary>
/// Admin user management. Lists every account in the ASP.NET Identity
/// store along with the roles assigned to that user. Admin-only.
/// </summary>
[ApiController]
[Route("api/adminusers")]
[Authorize(Roles = "Admin")]
public class AdminUsersController : ControllerBase
{
    private readonly UserManager<IdentityUser> _userManager;

    public AdminUsersController(UserManager<IdentityUser> userManager)
    {
        _userManager = userManager;
    }

    // GET /api/adminusers
    [HttpGet]
    public async Task<IActionResult> GetUsers()
    {
        var users = _userManager.Users.ToList();
        var result = new List<object>(users.Count);

        foreach (var u in users)
        {
            var roles = await _userManager.GetRolesAsync(u);
            result.Add(new
            {
                id = u.Id,
                email = u.Email,
                emailConfirmed = u.EmailConfirmed,
                lockedOut = u.LockoutEnd.HasValue && u.LockoutEnd > DateTimeOffset.UtcNow,
                roles
            });
        }

        return Ok(result);
    }
}
