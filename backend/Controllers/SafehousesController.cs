using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Intex2026.Api.Data;
using Intex2026.Api.Models;

namespace Intex2026.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Staff")]
public class SafehousesController : ControllerBase
{
    private readonly AppDbContext _context;

    public SafehousesController(AppDbContext context)
    {
        _context = context;
    }

    // GET /api/safehouses
    // Returns every safehouse with a live resident count computed from the
    // residents table (filtered to open cases). Occupancy falls back to the
    // stored `current_occupancy` column if the residents join is empty.
    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetSafehouses()
    {
        var rows = await (
            from sh in _context.Safehouses.AsNoTracking()
            join r in _context.Residents.AsNoTracking()
                on sh.SafehouseId equals r.SafehouseId into residentGroup
            from r in residentGroup.DefaultIfEmpty()
            group new { sh, r } by new
            {
                sh.SafehouseId,
                sh.SafehouseCode,
                sh.Name,
                sh.Region,
                sh.Province,
                sh.City,
                sh.Country,
                sh.Status,
                sh.OpenDate,
                sh.CapacityGirls,
                sh.CapacityStaff,
                sh.CurrentOccupancy
            }
            into g
            select new
            {
                g.Key.SafehouseId,
                g.Key.SafehouseCode,
                g.Key.Name,
                g.Key.Region,
                g.Key.Province,
                g.Key.City,
                g.Key.Country,
                g.Key.Status,
                g.Key.OpenDate,
                g.Key.CapacityGirls,
                g.Key.CapacityStaff,
                StoredOccupancy = g.Key.CurrentOccupancy,
                ActiveResidents = g.Count(x => x.r != null
                    && (x.r.CaseStatus == null
                        || x.r.CaseStatus == "Active"
                        || x.r.CaseStatus == "Open"
                        || x.r.DateClosed == null))
            }
        )
        .OrderBy(s => s.Name)
        .ToListAsync();

        return Ok(rows);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Safehouse>> GetSafehouse(int id)
    {
        var safehouse = await _context.Safehouses
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.SafehouseId == id);
        if (safehouse == null) return NotFound();
        return Ok(safehouse);
    }

    [HttpPost]
    public async Task<ActionResult<Safehouse>> CreateSafehouse(Safehouse safehouse)
    {
        _context.Safehouses.Add(safehouse);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetSafehouse), new { id = safehouse.SafehouseId }, safehouse);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateSafehouse(int id, Safehouse safehouse)
    {
        if (id != safehouse.SafehouseId) return BadRequest();
        _context.Entry(safehouse).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteSafehouse(int id)
    {
        var safehouse = await _context.Safehouses.FindAsync(id);
        if (safehouse == null) return NotFound();
        _context.Safehouses.Remove(safehouse);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
