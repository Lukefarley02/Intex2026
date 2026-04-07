using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Intex2026.Api.Data;
using Intex2026.Api.Models;

namespace Intex2026.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
<<<<<<< HEAD
[Authorize(Roles = "Admin,Staff")]
=======
[Authorize]  // All endpoints require authentication by default
>>>>>>> b896bfea2bd812da95f6cc6a7983738cab0ea8c6
public class SupportersController : ControllerBase
{
    private readonly AppDbContext _context;

    public SupportersController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<ActionResult<IEnumerable<Supporter>>> GetSupporters()
    {
        return await _context.Supporters.ToListAsync();
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<ActionResult<Supporter>> GetSupporter(int id)
    {
        var supporter = await _context.Supporters.FindAsync(id);
        if (supporter == null) return NotFound();
        return supporter;
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<ActionResult<Supporter>> CreateSupporter(Supporter supporter)
    {
        _context.Supporters.Add(supporter);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetSupporter), new { id = supporter.SupporterId }, supporter);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> UpdateSupporter(int id, Supporter supporter)
    {
        if (id != supporter.SupporterId) return BadRequest();
        _context.Entry(supporter).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
<<<<<<< HEAD
    [Authorize(Roles = "Admin")]
=======
    [Authorize(Roles = "Admin")]  // Only admins can delete
>>>>>>> b896bfea2bd812da95f6cc6a7983738cab0ea8c6
    public async Task<IActionResult> DeleteSupporter(int id)
    {
        var supporter = await _context.Supporters.FindAsync(id);
        if (supporter == null) return NotFound();
        _context.Supporters.Remove(supporter);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
