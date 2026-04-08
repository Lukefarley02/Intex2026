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
public class ResidentsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly UserManager<ApplicationUser> _users;

    public ResidentsController(AppDbContext context, UserManager<ApplicationUser> users)
    {
        _context = context;
        _users = users;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetResidents()
    {
        var scope = await UserScope.FromPrincipalAsync(User, _users);

        // Build the scoped resident query (residents are filtered through
        // their parent safehouse's region/city — see UserScope.ApplyToResidents).
        var query = scope.ApplyToResidents(
            _context.Residents.Include(r => r.Safehouse).AsNoTracking(),
            _context.Safehouses);

        var residents = await query.ToListAsync();
        var canSeeNotes = scope.IsAdmin; // Founder, Regional Manager, Location Manager

        return residents.Select(r => (object)new
        {
            r.ResidentId,
            r.SafehouseId,
            r.CaseControlNo,
            r.InternalCode,
            r.CaseStatus,
            r.DateOfBirth,
            r.DateOfAdmission,
            r.CurrentRiskLevel,
            NotesRestricted = canSeeNotes ? r.NotesRestricted : null,
            Safehouse = r.Safehouse == null
                ? null
                : new { r.Safehouse.Name, r.Safehouse.City, r.Safehouse.Region }
        }).ToList();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<object>> GetResident(int id)
    {
        var scope = await UserScope.FromPrincipalAsync(User, _users);

        var resident = await _context.Residents
            .Include(r => r.Safehouse)
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.ResidentId == id);
        if (resident == null) return NotFound();

        // Scope check via the parent safehouse.
        if (!scope.CanAccessSafehouseRow(resident.Safehouse))
            return Forbid();

        var canSeeNotes = scope.IsAdmin;
        return new
        {
            resident.ResidentId,
            resident.SafehouseId,
            resident.CaseControlNo,
            resident.InternalCode,
            resident.CaseStatus,
            resident.DateOfBirth,
            resident.DateOfAdmission,
            resident.CurrentRiskLevel,
            NotesRestricted = canSeeNotes ? resident.NotesRestricted : null,
            Safehouse = resident.Safehouse == null
                ? null
                : new { resident.Safehouse.Name, resident.Safehouse.City, resident.Safehouse.Region }
        };
    }

    [HttpPost]
    public async Task<ActionResult<Resident>> CreateResident(Resident resident)
    {
        var scope = await UserScope.FromPrincipalAsync(User, _users);

        // The new resident must belong to a safehouse the caller can access.
        var sh = await _context.Safehouses.AsNoTracking()
            .FirstOrDefaultAsync(s => s.SafehouseId == resident.SafehouseId);
        if (!scope.CanAccessSafehouseRow(sh))
            return Forbid();

        _context.Residents.Add(resident);
        await _context.SaveChangesAsync();
        await RecalculateOccupancyAsync(resident.SafehouseId);
        return CreatedAtAction(nameof(GetResident), new { id = resident.ResidentId }, resident);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateResident(int id, Resident resident)
    {
        if (id != resident.ResidentId) return BadRequest();

        var scope = await UserScope.FromPrincipalAsync(User, _users);

        // Caller must own both the existing resident's safehouse AND the
        // target safehouse (to prevent re-parenting a resident out of scope).
        var existing = await _context.Residents
            .Include(r => r.Safehouse)
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.ResidentId == id);
        if (existing == null) return NotFound();
        if (!scope.CanAccessSafehouseRow(existing.Safehouse))
            return Forbid();

        if (existing.SafehouseId != resident.SafehouseId)
        {
            var newSh = await _context.Safehouses.AsNoTracking()
                .FirstOrDefaultAsync(s => s.SafehouseId == resident.SafehouseId);
            if (!scope.CanAccessSafehouseRow(newSh))
                return Forbid();
        }

        _context.Entry(resident).State = EntityState.Modified;
        await _context.SaveChangesAsync();

        // Keep safehouses.current_occupancy in sync with the live count of
        // Active residents. When a resident moves houses or changes status,
        // both the old and new safehouse occupancy can shift.
        await RecalculateOccupancyAsync(existing.SafehouseId);
        if (existing.SafehouseId != resident.SafehouseId)
            await RecalculateOccupancyAsync(resident.SafehouseId);

        return NoContent();
    }

    // Only founder + regional + location managers can delete (Admin role).
    // Staff cannot delete residents at all.
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteResident(int id)
    {
        var scope = await UserScope.FromPrincipalAsync(User, _users);

        var resident = await _context.Residents
            .Include(r => r.Safehouse)
            .FirstOrDefaultAsync(r => r.ResidentId == id);
        if (resident == null) return NotFound();
        if (!scope.CanAccessSafehouseRow(resident.Safehouse))
            return Forbid();

        var safehouseId = resident.SafehouseId;
        _context.Residents.Remove(resident);
        await _context.SaveChangesAsync();
        await RecalculateOccupancyAsync(safehouseId);
        return NoContent();
    }

    // Recomputes safehouses.current_occupancy for a single safehouse from
    // the live count of residents whose case_status = 'Active'. Called
    // after every resident insert/update/delete so the stored column stays
    // in sync with reality. 'Closed' and 'Transferred' residents are not
    // counted — they represent girls who have left the house.
    private async Task RecalculateOccupancyAsync(int safehouseId)
    {
        var safehouse = await _context.Safehouses.FindAsync(safehouseId);
        if (safehouse == null) return;

        var activeCount = await _context.Residents
            .AsNoTracking()
            .CountAsync(r => r.SafehouseId == safehouseId && r.CaseStatus == "Active");

        safehouse.CurrentOccupancy = activeCount;
        await _context.SaveChangesAsync();
    }
}
