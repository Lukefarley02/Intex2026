using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Intex2026.Api.Data;

namespace Intex2026.Api.Controllers;

// ── DTOs ──────────────────────────────────────────────────────────────────────
public record RegisterRequest(string Email, string Password, string? Role = null, string? Region = null, string? City = null);
public record LoginRequest(string Email, string Password);
public record AuthResponse(string Token, string Email, IList<string> Roles, string? Region, string? City);

// ── Controller ────────────────────────────────────────────────────────────────
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly IConfiguration _config;

    public AuthController(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        IConfiguration config)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _config = config;
    }

    // POST /api/auth/register
    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            Region = request.Region,
            City = request.City
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            return BadRequest(result.Errors);

        // All users get the Donor role by default
        await _userManager.AddToRoleAsync(user, "Donor");

        // Optionally assign Staff or Admin (and still keep Donor)
        if (!string.IsNullOrWhiteSpace(request.Role))
        {
            var role = request.Role.Trim();
            if (role == "Staff" || role == "Admin")
                await _userManager.AddToRoleAsync(user, role);
        }

        var roles = await _userManager.GetRolesAsync(user);
        var token = GenerateJwt(user, roles);
        return Ok(new AuthResponse(token, user.Email!, roles, user.Region, user.City));
    }

    // POST /api/auth/login
    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null)
            return Unauthorized(new { message = "Invalid credentials." });

        var result = await _signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: false);
        if (!result.Succeeded)
            return Unauthorized(new { message = "Invalid credentials." });

        var roles = await _userManager.GetRolesAsync(user);
        var token = GenerateJwt(user, roles);
        return Ok(new AuthResponse(token, user.Email!, roles, user.Region, user.City));
    }

    // POST /api/auth/logout
    [HttpPost("logout")]
    public IActionResult Logout()
    {
        // JWT is stateless — instruct the client to discard the token
        return Ok(new { message = "Logged out. Please discard your token." });
    }

    // GET /api/auth/me
    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var user = await _userManager.FindByEmailAsync(User.Identity!.Name!);
        if (user == null) return Unauthorized();

        var roles = await _userManager.GetRolesAsync(user);
        return Ok(new
        {
            email = user.Email,
            roles,
            region = user.Region,
            city = user.City,
            // Convenience: derive admin scope so the frontend can show the right UI.
            // "founder" replaces the old "company" label and aligns with the
            // four-tier access model (founder / region / location / staff).
            adminScope = roles.Contains("Admin")
                ? (user.Region == null ? "founder" : user.City == null ? "region" : "location")
                : null
        });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private string GenerateJwt(ApplicationUser user, IList<string> roles)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(JwtRegisteredClaimNames.Email, user.Email!),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(ClaimTypes.Name, user.Email!),
            new("AspNet.Identity.SecurityStamp", user.SecurityStamp ?? "")
        };

        // Embed every role as a claim so [Authorize(Roles = "...")] works
        claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));

        // Embed Region and City so controllers can filter without a DB round-trip
        if (!string.IsNullOrEmpty(user.Region))
            claims.Add(new Claim("region", user.Region));
        if (!string.IsNullOrEmpty(user.City))
            claims.Add(new Claim("city", user.City));

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
