using Microsoft.AspNetCore.Identity;

namespace Intex2026.Api.Data;

/// <summary>
/// Custom Identity user that extends the default IdentityUser with
/// organizational scope columns used to determine admin access level:
///
///   Region = null, City = null  →  Company Manager  (all locations)
///   Region = set,  City = null  →  Regional Manager (their region)
///   Region = set,  City = set   →  Location Manager (their city)
///
/// Staff must have both Region and City set.
/// Donors: Region/City are ignored for access control.
/// </summary>
public class ApplicationUser : IdentityUser
{
    /// <summary>The region this user is scoped to (null = company-wide).</summary>
    public string? Region { get; set; }

    /// <summary>The city/location this user is scoped to (null = region-wide or company-wide).</summary>
    public string? City { get; set; }

    /// <summary>
    /// True when the account was created by staff with a temporary seed
    /// password (e.g. via the "Log donation" flow). On the next successful
    /// login the frontend will force the user into a password-change screen
    /// before any other navigation. Cleared automatically in
    /// AuthController.ChangePassword once the user sets a new password.
    /// </summary>
    public bool MustChangePassword { get; set; }
}
