using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Intex2026.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]  // Explicitly public — no auth required
    public IActionResult Get() => Ok(new { status = "healthy", timestamp = DateTime.UtcNow });
}
