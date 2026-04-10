using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Intex2026.Api.Authorization;
using Intex2026.Api.Data;
using Intex2026.Api.Models;

namespace Intex2026.Api.Controllers;

// Intervention Plans / Case Conference page — forward-looking plans
// created during internal case management conferences. Plans inherit
// their parent resident's safehouse for access-control purposes
// (same scoping as ProcessRecordingsController).
//
//   Founder         → all
//   Regional Mgr    → safehouses where region == user.Region
//   Location Mgr    → safehouse where city == user.City
//   Staff           → safehouse where city == user.City
//
// Admin (any tier) can always modify/delete any row in scope.
// Staff can only modify/delete rows they personally created.
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Staff")]
public class InterventionPlansController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly UserManager<ApplicationUser> _users;

    public InterventionPlansController(AppDbContext context, UserManager<ApplicationUser> users)
    {
        _context = context;
        _users = users;
    }

    // GET /api/interventionplans?residentId=123
    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetInterventionPlans(
        [FromQuery] int? residentId)
    {
        var scope = await UserScope.FromPrincipalAsync(User, _users);

        var visibleResidentIds = scope
            .ApplyToResidents(_context.Residents.AsNoTracking(), _context.Safehouses)
            .Select(r => r.ResidentId);

        var query = _context.InterventionPlans.AsNoTracking()
            .Where(ip => visibleResidentIds.Contains(ip.ResidentId));

        if (residentId.HasValue)
            query = query.Where(ip => ip.ResidentId == residentId.Value);

        var list = await query
            .OrderByDescending(ip => ip.CaseConferenceDate)
            .ThenByDescending(ip => ip.CreatedAt)
            .ToListAsync();

        var callerId = _users.GetUserId(User);
        return list.Select(ip => (object)new
        {
            ip.PlanId,
            ip.ResidentId,
            ip.PlanCategory,
            ip.PlanDescription,
            ip.ServicesProvided,
            ip.TargetValue,
            ip.TargetDate,
            ip.Status,
            ip.CaseConferenceDate,
            ip.CreatedAt,
            ip.UpdatedAt,
            ip.CreatedByUserId,
            CanModify = scope.IsAdmin || ip.CreatedByUserId == callerId,
        }).ToList();
    }

    // GET /api/interventionplans/5
    [HttpGet("{id}")]
    public async Task<ActionResult<object>> GetInterventionPlan(int id)
    {
        var scope = await UserScope.FromPrincipalAsync(User, _users);

        var ip = await _context.InterventionPlans
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.PlanId == id);
        if (ip == null) return NotFound();

        if (!await CanAccessResidentAsync(ip.ResidentId, scope)) return Forbid();

        var callerId = _users.GetUserId(User);
        return new
        {
            ip.PlanId,
            ip.ResidentId,
            ip.PlanCategory,
            ip.PlanDescription,
            ip.ServicesProvided,
            ip.TargetValue,
            ip.TargetDate,
            ip.Status,
            ip.CaseConferenceDate,
            ip.CreatedAt,
            ip.UpdatedAt,
            ip.CreatedByUserId,
            CanModify = scope.IsAdmin || ip.CreatedByUserId == callerId,
        };
    }

    // POST /api/interventionplans
    [HttpPost]
    public async Task<ActionResult<InterventionPlan>> CreateInterventionPlan(
        [FromBody] InterventionPlan dto)
    {
        var scope = await UserScope.FromPrincipalAsync(User, _users);
        if (!await CanAccessResidentAsync(dto.ResidentId, scope)) return Forbid();

        // intervention_plans has a non-identity PK in the canonical schema.
        var nextId = (await _context.InterventionPlans.AnyAsync())
            ? await _context.InterventionPlans.MaxAsync(ip => ip.PlanId) + 1
            : 1;
        dto.PlanId = nextId;

        dto.CreatedAt = DateTime.UtcNow;
        dto.UpdatedAt = DateTime.UtcNow;

        // Stamp the caller as the owner.
        dto.CreatedByUserId = _users.GetUserId(User);

        _context.InterventionPlans.Add(dto);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetInterventionPlan),
            new { id = dto.PlanId }, dto);
    }

    // PUT /api/interventionplans/5
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateInterventionPlan(int id,
        [FromBody] InterventionPlan dto)
    {
        if (id != dto.PlanId) return BadRequest();

        var scope = await UserScope.FromPrincipalAsync(User, _users);
        var existing = await _context.InterventionPlans.AsNoTracking()
            .FirstOrDefaultAsync(ip => ip.PlanId == id);
        if (existing == null) return NotFound();
        if (!await CanAccessResidentAsync(existing.ResidentId, scope)) return Forbid();
        if (existing.ResidentId != dto.ResidentId
            && !await CanAccessResidentAsync(dto.ResidentId, scope))
            return Forbid();

        // Ownership check — Staff can only modify records they created.
        var callerId = _users.GetUserId(User);
        if (!scope.IsAdmin && existing.CreatedByUserId != callerId)
            return Forbid();

        // Preserve the original owner and creation timestamp.
        dto.CreatedByUserId = existing.CreatedByUserId;
        dto.CreatedAt = existing.CreatedAt;
        dto.UpdatedAt = DateTime.UtcNow;

        _context.Entry(dto).State = EntityState.Modified;
        try { await _context.SaveChangesAsync(); }
        catch (DbUpdateConcurrencyException)
        {
            if (!await _context.InterventionPlans.AnyAsync(ip => ip.PlanId == id))
                return NotFound();
            throw;
        }
        return NoContent();
    }

    // DELETE /api/interventionplans/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteInterventionPlan(int id)
    {
        var scope = await UserScope.FromPrincipalAsync(User, _users);

        var ip = await _context.InterventionPlans.FindAsync(id);
        if (ip == null) return NotFound();
        if (!await CanAccessResidentAsync(ip.ResidentId, scope)) return Forbid();

        var callerId = _users.GetUserId(User);
        if (!scope.IsAdmin && ip.CreatedByUserId != callerId)
            return Forbid();

        _context.InterventionPlans.Remove(ip);
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
