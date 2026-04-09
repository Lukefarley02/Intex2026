using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Intex2026.Api.Data;
using Intex2026.Api.Models;

namespace Intex2026.Api.Controllers;

// ── DTOs ──────────────────────────────────────────────────────────────────────
public record ForgotPasswordRequest(string Email);

public record PasswordResetRequestDto(
    int RequestId,
    string Email,
    string Status,
    DateTime CreatedAt,
    DateTime? ResolvedAt,
    string? ResolvedByEmail);

public record ResolveResetResponse(
    int RequestId,
    string Email,
    string TempPassword);

// ── Controller ────────────────────────────────────────────────────────────────
[ApiController]
[Route("api/password-reset")]
public class PasswordResetController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;

    public PasswordResetController(AppDbContext db, UserManager<ApplicationUser> userManager)
    {
        _db = db;
        _userManager = userManager;
    }

    // POST /api/password-reset/request
    // [AllowAnonymous] — anyone on the login page can call this.
    // Always returns 200 so we don't leak whether an email is registered.
    // A request row is only created when the email IS found in the system.
    [AllowAnonymous]
    [HttpPost("request")]
    public async Task<IActionResult> RequestReset([FromBody] ForgotPasswordRequest body)
    {
        if (string.IsNullOrWhiteSpace(body.Email))
            return BadRequest(new { message = "Email is required." });

        var user = await _userManager.FindByEmailAsync(body.Email.Trim().ToLowerInvariant());

        if (user != null)
        {
            // Check for an existing pending request from this email to avoid
            // spamming the admin panel. If one already exists, don't create another.
            var alreadyPending = await _db.PasswordResetRequests
                .AnyAsync(r => r.Email == body.Email.Trim().ToLowerInvariant()
                            && r.Status == "Pending");

            if (!alreadyPending)
            {
                var nextId = (_db.PasswordResetRequests.Any()
                    ? await _db.PasswordResetRequests.MaxAsync(r => r.RequestId)
                    : 0) + 1;

                _db.PasswordResetRequests.Add(new PasswordResetRequest
                {
                    RequestId = nextId,
                    Email = body.Email.Trim().ToLowerInvariant(),
                    Status = "Pending",
                    CreatedAt = DateTime.UtcNow,
                });
                await _db.SaveChangesAsync();
            }
        }
        // Always 200 — the response intentionally does not reveal whether
        // the email exists so we don't allow email enumeration attacks.
        return Ok(new { message = "If that email is in our system, an admin will be notified to reset your password." });
    }

    // GET /api/password-reset/requests
    // Admin-only: lists all pending password reset requests.
    [Authorize(Roles = "Admin")]
    [HttpGet("requests")]
    public async Task<IActionResult> GetRequests()
    {
        var requests = await _db.PasswordResetRequests
            .Where(r => r.Status == "Pending")
            .OrderBy(r => r.CreatedAt)
            .ToListAsync();

        var resolverIds = requests
            .Where(r => r.ResolvedByUserId != null)
            .Select(r => r.ResolvedByUserId!)
            .Distinct()
            .ToList();

        // Build a map from user ID → email for display
        var resolverEmails = new Dictionary<string, string>();
        foreach (var uid in resolverIds)
        {
            var u = await _userManager.FindByIdAsync(uid);
            if (u?.Email != null) resolverEmails[uid] = u.Email;
        }

        var dtos = requests.Select(r => new PasswordResetRequestDto(
            r.RequestId,
            r.Email,
            r.Status,
            r.CreatedAt,
            r.ResolvedAt,
            r.ResolvedByUserId != null && resolverEmails.TryGetValue(r.ResolvedByUserId, out var e) ? e : null
        )).ToList();

        return Ok(dtos);
    }

    // POST /api/password-reset/requests/{id}/resolve
    // Admin-only: generates a temp password, resets the user's password,
    // marks the request resolved, and returns the temp password to the admin
    // (shown once in the UI — not stored in plain-text after this point).
    [Authorize(Roles = "Admin")]
    [HttpPost("requests/{id:int}/resolve")]
    public async Task<IActionResult> ResolveRequest(int id)
    {
        var request = await _db.PasswordResetRequests.FindAsync(id);
        if (request == null || request.Status != "Pending")
            return NotFound(new { message = "Request not found or already resolved." });

        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null)
        {
            // User was deleted after the request was submitted
            request.Status = "Resolved";
            request.ResolvedAt = DateTime.UtcNow;
            request.ResolvedByUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            await _db.SaveChangesAsync();
            return NotFound(new { message = "User account no longer exists." });
        }

        // Generate a 14-char temp password that satisfies the hardened policy.
        var tempPw = GenerateTempPassword();

        var resetToken = await _userManager.GeneratePasswordResetTokenAsync(user);
        var result = await _userManager.ResetPasswordAsync(user, resetToken, tempPw);
        if (!result.Succeeded)
            return BadRequest(result.Errors);

        // Force the user to change on next login.
        user.MustChangePassword = true;
        await _userManager.UpdateAsync(user);

        // Mark the request as resolved (don't persist the temp password —
        // the admin sees it once, and that's sufficient).
        request.Status = "Resolved";
        request.ResolvedAt = DateTime.UtcNow;
        request.ResolvedByUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        request.TempPassword = null;
        await _db.SaveChangesAsync();

        return Ok(new ResolveResetResponse(request.RequestId, request.Email, tempPw));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /// <summary>
    /// Generates a 14-character temporary password that satisfies the hardened
    /// Identity policy: ≥14 chars, ≥1 upper, ≥1 lower, ≥1 digit, ≥1 symbol.
    /// Ambiguous glyphs (0/O/1/l/I) are excluded for readability.
    /// Fisher-Yates shuffled so the character category positions are random.
    /// </summary>
    private static string GenerateTempPassword()
    {
        const string upper  = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        const string lower  = "abcdefghjkmnpqrstuvwxyz";
        const string digits = "23456789";
        const string symbol = "!@#$%^&*";

        var chars = new char[14];

        // Guarantee at least 2 of each required category
        for (int i = 0; i < 2; i++) chars[i]    = upper[RandomNumberGenerator.GetInt32(upper.Length)];
        for (int i = 2; i < 4; i++) chars[i]    = lower[RandomNumberGenerator.GetInt32(lower.Length)];
        for (int i = 4; i < 6; i++) chars[i]    = digits[RandomNumberGenerator.GetInt32(digits.Length)];
        for (int i = 6; i < 8; i++) chars[i]    = symbol[RandomNumberGenerator.GetInt32(symbol.Length)];

        // Fill remaining 6 chars from the combined pool
        var pool = upper + lower + digits + symbol;
        for (int i = 8; i < 14; i++) chars[i]   = pool[RandomNumberGenerator.GetInt32(pool.Length)];

        // Fisher-Yates shuffle
        for (int i = chars.Length - 1; i > 0; i--)
        {
            int j = RandomNumberGenerator.GetInt32(i + 1);
            (chars[i], chars[j]) = (chars[j], chars[i]);
        }

        return new string(chars);
    }
}
