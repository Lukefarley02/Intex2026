using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Intex2026.Api.Data;
using Intex2026.Api.Models;

namespace Intex2026.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]  // All endpoints require authentication by default
public class ResidentsController : ControllerBase
{
    private readonly AppDbContext _context;

    public ResidentsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<ActionResult<IEnumerable<object>>> GetResidents()
    {
        var isAdmin = User.IsInRole("Admin");

        var residents = await _context.Residents
            .Include(r => r.Safehouse)
            .ToListAsync();

        // Strip restricted fields for non-admin users
        if (!isAdmin)
        {
            return residents.Select(r => new
            {
                r.ResidentId,
                r.SafehouseId,
                r.FirstName,
                r.LastName,
                r.DateOfBirth,
                r.AdmissionDate,
                r.Status,
                r.RiskLevel,
                Safehouse = r.Safehouse == null ? null : new { r.Safehouse.Name }
                // NotesRestricted intentionally excluded
            }).ToList<object>();
        }

        return residents.Select(r => new
        {
            r.ResidentId,
            r.SafehouseId,
            r.FirstName,
            r.LastName,
            r.DateOfBirth,
            r.AdmissionDate,
            r.Status,
            r.RiskLevel,
            r.NotesRestricted,
            Safehouse = r.Safehouse == null ? null : new { r.Safehouse.Name }
        }).ToList<object>();
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<ActionResult<object>> GetResident(int id)
    {
        var resident = await _context.Residents
            .Include(r => r.Safehouse)
            .FirstOrDefaultAsync(r => r.ResidentId == id);

        if (resident == null) return NotFound();

        var isAdmin = User.IsInRole("Admin");

        if (!isAdmin)
        {
            return new
            {
                resident.ResidentId,
                resident.SafehouseId,
                resident.FirstName,
                resident.LastName,
                resident.DateOfBirth,
                resident.AdmissionDate,
                resident.Status,
                resident.RiskLevel,
                Safehouse = resident.Safehouse == null ? null : new { resident.Safehouse.Name }
            };
        }

        return new
        {
            resident.ResidentId,
            resident.SafehouseId,
            resident.FirstName,
            resident.LastName,
            resident.DateOfBirth,
            resident.AdmissionDate,
            resident.Status,
            resident.RiskLevel,
            resident.NotesRestricted,
            Safehouse = resident.Safehouse == null ? null : new { resident.Safehouse.Name }
        };
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<ActionResult<Resident>> CreateResident(Resident resident)
    {
        _context.Residents.Add(resident);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetResident), new { id = resident.ResidentId }, resident);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> UpdateResident(int id, Resident resident)
    {
        if (id != resident.ResidentId) return BadRequest();
        _context.Entry(resident).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]  // Only admins can delete
    public async Task<IActionResult> DeleteResident(int id)
    {
        var resident = await _context.Residents.FindAsync(id);
        if (resident == null) return NotFound();
        _context.Residents.Remove(resident);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
