using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
<<<<<<< HEAD

namespace Intex2026.Api.Controllers;

// ── DTOs ─────────────────────────────────────────────────────────────────────

public record RegisterRequest(string Email, string Password, string? Role = null);
public record LoginRequest(string Email, string Password);
public record AuthResponse(string Token, string Email, IList<string> Roles);

// ── Controller ────────────────────────────────────────────────────────────────

[ApiController]
[Route("api/auth")]
=======
using Intex2026.Api.DTOs;

namespace Intex2026.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
>>>>>>> b896bfea2bd812da95f6cc6a7983738cab0ea8c6
public class AuthController : ControllerBase
{
    private readonly UserManager<IdentityUser> _userManager;
    private readonly SignInManager<IdentityUser> _signInManager;
<<<<<<< HEAD
    private readonly IConfiguration _config;
=======
    private readonly IConfiguration _configuration;
>>>>>>> b896bfea2bd812da95f6cc6a7983738cab0ea8c6

    public AuthController(
        UserManager<IdentityUser> userManager,
        SignInManager<IdentityUser> signInManager,
<<<<<<< HEAD
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
        var user = new IdentityUser { UserName = request.Email, Email = request.Email };
        var result = await _userManager.CreateAsync(user, request.Password);

        if (!result.Succeeded)
            return BadRequest(result.Errors);

        // All users get the Donor role by default
        await _userManager.AddToRoleAsync(user, "Donor");

        // Optionally assign Staff or Admin (and still keep Donor)
        if (!string.IsNullOrWhiteSpace(request.Role))
        {
            var upper = request.Role.Trim();
            if (upper == "Staff" || upper == "Admin")
                await _userManager.AddToRoleAsync(user, upper);
        }

        var roles = await _userManager.GetRolesAsync(user);
        var token = GenerateJwt(user, roles);
        return Ok(new AuthResponse(token, user.Email!, roles));
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
        return Ok(new AuthResponse(token, user.Email!, roles));
    }

    // POST /api/auth/logout
    [HttpPost("logout")]
    public IActionResult Logout()
    {
        // JWT is stateless — instruct the client to discard the token
        return Ok(new { message = "Logged out. Please discard your token." });
    }

    // GET /api/auth/me
=======
        IConfiguration configuration)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _configuration = configuration;
    }

    /// <summary>
    /// Register a new user account. Defaults to "Donor" role.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var user = new IdentityUser
        {
            UserName = dto.Email,
            Email = dto.Email
        };

        var result = await _userManager.CreateAsync(user, dto.Password);

        if (!result.Succeeded)
        {
            foreach (var error in result.Errors)
                ModelState.AddModelError(error.Code, error.Description);
            return BadRequest(ModelState);
        }

        // Default role for self-registration
        await _userManager.AddToRoleAsync(user, "Donor");

        return Ok(new { message = "Registration successful." });
    }

    /// <summary>
    /// Authenticate and receive a JWT token.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var user = await _userManager.FindByEmailAsync(dto.Email);
        if (user == null)
            return Unauthorized(new { message = "Invalid email or password." });

        var result = await _signInManager.CheckPasswordSignInAsync(user, dto.Password, lockoutOnFailure: true);

        if (result.IsLockedOut)
            return Unauthorized(new { message = "Account is locked. Try again in 15 minutes." });

        if (!result.Succeeded)
            return Unauthorized(new { message = "Invalid email or password." });

        // Generate JWT
        var token = await GenerateJwtToken(user);
        var roles = await _userManager.GetRolesAsync(user);

        return Ok(new AuthResponseDto
        {
            Token = token.Token,
            Expiration = token.Expiration,
            Email = user.Email!,
            Roles = roles
        });
    }

    /// <summary>
    /// Logout — client-side token discard. Included for API completeness.
    /// </summary>
    [Authorize]
    [HttpPost("logout")]
    public IActionResult Logout()
    {
        // JWT is stateless — actual token invalidation happens client-side.
        // This endpoint exists so the frontend has a consistent API surface.
        return Ok(new { message = "Logged out successfully." });
    }

    /// <summary>
    /// Get current authenticated user's info and roles.
    /// </summary>
>>>>>>> b896bfea2bd812da95f6cc6a7983738cab0ea8c6
    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
<<<<<<< HEAD
        var user = await _userManager.FindByEmailAsync(User.Identity!.Name!);
        if (user == null) return Unauthorized();

        var roles = await _userManager.GetRolesAsync(user);
        return Ok(new { email = user.Email, roles });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private string GenerateJwt(IdentityUser user, IList<string> roles)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(JwtRegisteredClaimNames.Email, user.Email!),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(ClaimTypes.Name, user.Email!)
        };

        // Embed every role as a claim so [Authorize(Roles = "...")] works
        claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
=======
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
            return Unauthorized();

        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
            return Unauthorized();

        var roles = await _userManager.GetRolesAsync(user);

        return Ok(new UserInfoDto
        {
            Email = user.Email!,
            Roles = roles
        });
    }

    // ----- Private helpers -----

    private async Task<(string Token, DateTime Expiration)> GenerateJwtToken(IdentityUser user)
    {
        var roles = await _userManager.GetRolesAsync(user);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Email, user.Email!),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };

        // Add each role as a claim
        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var jwtSettings = _configuration.GetSection("Jwt");
        var secretKey = jwtSettings["SecretKey"]!;
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var expirationMinutes = int.Parse(jwtSettings["ExpirationMinutes"] ?? "60");
        var expiration = DateTime.UtcNow.AddMinutes(expirationMinutes);

        var token = new JwtSecurityToken(
            issuer: jwtSettings["Issuer"],
            audience: jwtSettings["Audience"],
            claims: claims,
            expires: expiration,
            signingCredentials: creds
        );

        return (new JwtSecurityTokenHandler().WriteToken(token), expiration);
>>>>>>> b896bfea2bd812da95f6cc6a7983738cab0ea8c6
    }
}
