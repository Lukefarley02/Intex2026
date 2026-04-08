using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Intex2026.Api.Authorization;
using Intex2026.Api.Data;
using Intex2026.Api.Models;

namespace Intex2026.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Staff")]
public class SafehousesController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly UserManager<ApplicationUser> _users;

    public SafehousesController(AppDbContext context, UserManager<ApplicationUser> users)
    {
        _context = context;
        _users = users;
    }

    // GET /api/safehouses
    // Returns every safehouse the caller can see, with a live resident count
    // computed from the residents table.
    //
    // "Active" = case_status = 'Active' exactly, matching the canonical
    // two-value enum defined in lighthouse_schema.sql line 159
    // (case_status NVARCHAR(20) NOT NULL DEFAULT 'Active' — Active, Closed).
    // Do NOT widen this to `date_closed IS NULL` or pattern-matches on other
    // strings — that mis-counts rows whose status is 'Closed' but whose
    // date_closed was never populated, and is what caused the Safehouses page
    // numbers to drift from the true occupancy in the data.
    //
    // Founder         → all safehouses
    // Regional Mgr    → safehouses where region == user.Region
    // Location Mgr    → safehouse where city == user.City
    // Staff           → safehouse where city == user.City
    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetSafehouses()
    {
        var scope = await UserScope.FromPrincipalAsync(User, _users);
        var scoped = scope.ApplyToSafehouses(_context.Safehouses.AsNoTracking());

        var rows = await (
            from sh in scoped
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
                ActiveResidents = g.Count(x => x.r != null && x.r.CaseStatus == "Active")
            }
        )
        .OrderBy(s => s.Name)
        .ToListAsync();

        return Ok(rows);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Safehouse>> GetSafehouse(int id)
    {
        var scope = await UserScope.FromPrincipalAsync(User, _users);
        var safehouse = await _context.Safehouses
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.SafehouseId == id);
        if (safehouse == null) return NotFound();
        if (!scope.CanAccessSafehouseRow(safehouse)) return Forbid();
        return Ok(safehouse);
    }

    // Creating a safehouse is a structural change — only founders can do it.
    // (Regional/location managers operate within an existing footprint.)
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<Safehouse>> CreateSafehouse(Safehouse safehouse)
    {
        var scope = await UserScope.FromPrincipalAsync(User, _users);
        if (!scope.IsFounder) return Forbid();

        _context.Safehouses.Add(safehouse);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetSafehouse), new { id = safehouse.SafehouseId }, safehouse);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateSafehouse(int id, Safehouse safehouse)
    {
        if (id != safehouse.SafehouseId) return BadRequest();

        var scope = await UserScope.FromPrincipalAsync(User, _users);
        var existing = await _context.Safehouses.AsNoTracking()
            .FirstOrDefaultAsync(s => s.SafehouseId == id);
        if (existing == null) return NotFound();
        if (!scope.CanAccessSafehouseRow(existing)) return Forbid();

        // Disallow moving a safehouse out of the manager's region/city.
        if (!scope.IsFounder && (
            !string.Equals(existing.Region, safehouse.Region, StringComparison.OrdinalIgnoreCase) ||
            !string.Equals(existing.City, safehouse.City, StringComparison.OrdinalIgnoreCase)))
            return Forbid();

        _context.Entry(safehouse).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // Founder only.
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteSafehouse(int id)
    {
        var scope = await UserScope.FromPrincipalAsync(User, _users);
        if (!scope.IsFounder) return Forbid();

        var safehouse = await _context.Safehouses.FindAsync(id);
        if (safehouse == null) return NotFound();
        _context.Safehouses.Remove(safehouse);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
