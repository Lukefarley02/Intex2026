using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Intex2026.Api.Models;

/// <summary>
/// A self-service password-reset request submitted from the login page.
/// Staff/donors click "Forgot password?", enter their email, and a pending
/// request appears in the admin panel. An admin resolves it by generating a
/// one-time temporary password, which the user must change on first login.
/// </summary>
[Table("password_reset_requests")]
public class PasswordResetRequest
{
    [Key]
    [Column("request_id")]
    public int RequestId { get; set; }

    /// <summary>The email address that submitted the request.</summary>
    [Column("email")]
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// "Pending" until an admin resolves it; "Resolved" after the admin
    /// resets the password; "NotFound" if the email was not in the system
    /// (recorded for audit purposes only — the frontend never reveals this).
    /// </summary>
    [Column("status")]
    public string Status { get; set; } = "Pending";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("resolved_at")]
    public DateTime? ResolvedAt { get; set; }

    /// <summary>Identity user ID of the admin who resolved this request.</summary>
    [Column("resolved_by_user_id")]
    public string? ResolvedByUserId { get; set; }

    /// <summary>
    /// The generated one-time password returned to the admin on resolve.
    /// Stored as plain-text only long enough for the admin to copy it —
    /// the user's actual password hash in ASP.NET Identity is what protects
    /// the account. This field is cleared (set to null) once the request is
    /// marked resolved and the temp password has been shown to the admin.
    /// </summary>
    [Column("temp_password")]
    public string? TempPassword { get; set; }
}
