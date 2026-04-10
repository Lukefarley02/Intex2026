using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Intex2026.Api.Authorization;
using Intex2026.Api.Data;
using Intex2026.Api.Models;

namespace Intex2026.Api.Controllers;

// Home Visitation & Case Conferences page (IS 413 requirement) — logs of
// home and field visits for each resident plus upcoming/past case conferences.
//
// Scoped through the parent resident's safehouse — same rules as
// ProcessRecordings: founders see all, regional managers see their region,
// location managers and staff see their city only. Founders can delete.
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Staff")]
public class HomeVisitationsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly UserManager<ApplicationUser> _users;

    public HomeVisitationsController(AppDbContext context, UserManager<ApplicationUser> users)
    {
        _context = context;
        _users = users;
    }

    // GET /api/homevisitations?residentId=123
    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetHomeVisitations(
        [FromQuery] int? residentId)
    {
        var scope = await UserScope.FromPrincipalAsync(User, _users);

        var visibleResidentIds = scope
            .ApplyToResidents(_context.Residents.AsNoTracking(), _context.Safehouses)
            .Select(r => r.ResidentId);

        var query = _context.HomeVisitations.AsNoTracking()
            .Where(v => visibleResidentIds.Contains(v.ResidentId));

        if (residentId.HasValue)
            query = query.Where(v => v.ResidentId == residentId.Value);

        var list = await query
            .OrderByDescending(v => v.VisitDate)
            .ToListAsync();

        var callerId = _users.GetUserId(User);
        return list.Select(v => (object)new
        {
            v.VisitationId,
            v.ResidentId,
            v.VisitDate,
            v.VisitType,
            v.Purpose,
            v.LocationVisited,
            v.FamilyMembersPresent,
            v.FamilyCooperationLevel,
            v.Observations,
            v.SafetyConcernsNoted,
            v.FollowUpNeeded,
            v.FollowUpNotes,
            v.VisitOutcome,
            v.SocialWorker,
            v.CreatedByUserId,
            // `canModify` lets the frontend gate Edit/Delete buttons per-row
            // without re-deriving the rule. Admins can always modify; Staff
            // can only modify rows they created.
            CanModify = scope.IsAdmin || v.CreatedByUserId == callerId
        }).ToList();
    }

    // GET /api/homevisitations/5
    [HttpGet("{id}")]
    public async Task<ActionResult<HomeVisitation>> GetHomeVisitation(int id)
    {
        var scope = await UserScope.FromPrincipalAsync(User, _users);
        var v = await _context.HomeVisitations
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.VisitationId == id);
        if (v == null) return NotFound();
        if (!await CanAccessResidentAsync(v.ResidentId, scope)) return Forbid();
        return v;
    }

    // POST /api/homevisitations
    [HttpPost]
    public async Task<ActionResult<HomeVisitation>> CreateHomeVisitation(
        [FromBody] HomeVisitation dto)
    {
        var scope = await UserScope.FromPrincipalAsync(User, _users);
        if (!await CanAccessResidentAsync(dto.ResidentId, scope)) return Forbid();

        var nextId = (await _context.HomeVisitations.AnyAsync())
            ? await _context.HomeVisitations.MaxAsync(v => v.VisitationId) + 1
            : 1;
        dto.VisitationId = nextId;

        if (dto.VisitDate == null) dto.VisitDate = DateTime.UtcNow;

        // Stamp the caller as the owner. Trusted server-side.
        dto.CreatedByUserId = _users.GetUserId(User);

        _context.HomeVisitations.Add(dto);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetHomeVisitation),
            new { id = dto.VisitationId }, dto);
    }

    // PUT /api/homevisitations/5
    //
    // Ownership rules:
    //   Admin (any tier) — may edit any record inside their scope.
    //   Staff            — may ONLY edit records they personally created.
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateHomeVisitation(int id,
        [FromBody] HomeVisitation dto)
    {
        if (id != dto.VisitationId) return BadRequest();

        var scope = await UserScope.FromPrincipalAsync(User, _users);
        var existing = await _context.HomeVisitations.AsNoTracking()
            .FirstOrDefaultAsync(v => v.VisitationId == id);
        if (existing == null) return NotFound();
        if (!await CanAccessResidentAsync(existing.ResidentId, scope)) return Forbid();
        if (existing.ResidentId != dto.ResidentId
            && !await CanAccessResidentAsync(dto.ResidentId, scope))
            return Forbid();

        var callerId = _users.GetUserId(User);
        if (!scope.IsAdmin && existing.CreatedByUserId != callerId)
            return Forbid();

        // Preserve the original owner regardless of what the client sent.
        dto.CreatedByUserId = existing.CreatedByUserId;

        _context.Entry(dto).State = EntityState.Modified;
        try { await _context.SaveChangesAsync(); }
        catch (DbUpdateConcurrencyException)
        {
            if (!await _context.HomeVisitations.AnyAsync(v => v.VisitationId == id))
                return NotFound();
            throw;
        }
        return NoContent();
    }

    // DELETE /api/homevisitations/5
    //
    // Ownership rules:
    //   Admin (any tier) — may delete any record inside their scope.
    //   Staff            — may ONLY delete records they personally created.
    //
    // (Previously Founder-only. Relaxed so Staff can retract their own entries.)
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteHomeVisitation(int id)
    {
        var scope = await UserScope.FromPrincipalAsync(User, _users);

        var v = await _context.HomeVisitations.FindAsync(id);
        if (v == null) return NotFound();
        if (!await CanAccessResidentAsync(v.ResidentId, scope)) return Forbid();

        var callerId = _users.GetUserId(User);
        if (!scope.IsAdmin && v.CreatedByUserId != callerId)
            return Forbid();

        _context.HomeVisitations.Remove(v);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    private async Task<bool> CanAccessResidentAsync(int residentId, UserScope scope)
    {
        if (scope.IsFounder) return true;
        var safehouse = await (
            from r in _context.Residents.AsNoTracking()
            join sh in _context.Safehouses.AsNoTracking() on r.SafehouseId equals sh.SafehouseId
            where r.ResidentId == residentId
            select sh
        ).FirstOrDefaultAsync();
        return scope.CanAccessSafehouseRow(safehouse);
    }
}
