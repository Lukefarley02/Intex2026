using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Intex2026.Api.Authorization;
using Intex2026.Api.Data;
using Intex2026.Api.Models;

namespace Intex2026.Api.Controllers;

// Process Recording page (IS 413 requirement) — dated counseling session
// notes for each resident. Records inherit their parent resident's
// safehouse for access-control purposes:
//
//   Founder         → all
//   Regional Mgr    → safehouses where region == user.Region
//   Location Mgr    → safehouse where city == user.City
//   Staff           → safehouse where city == user.City
//
// Only Admin (any sub-tier) sees `notes_restricted` and only Founders can
// delete a recording.
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Staff")]
public class ProcessRecordingsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly UserManager<ApplicationUser> _users;

    public ProcessRecordingsController(AppDbContext context, UserManager<ApplicationUser> users)
    {
        _context = context;
        _users = users;
    }

    // GET /api/processrecordings?residentId=123
    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetProcessRecordings(
        [FromQuery] int? residentId)
    {
        var scope = await UserScope.FromPrincipalAsync(User, _users);

        // Resolve which residents the caller can see, then constrain by id.
        var visibleResidentIds = scope
            .ApplyToResidents(_context.Residents.AsNoTracking(), _context.Safehouses)
            .Select(r => r.ResidentId);

        var query = _context.ProcessRecordings.AsNoTracking()
            .Where(p => visibleResidentIds.Contains(p.ResidentId));

        if (residentId.HasValue)
            query = query.Where(p => p.ResidentId == residentId.Value);

        var list = await query
            .OrderByDescending(p => p.SessionDate)
            .ToListAsync();

        var canSeeNotes = scope.IsAdmin;
        var userId = scope.UserId;
        return list.Select(p => (object)new
        {
            p.RecordingId,
            p.ResidentId,
            p.SessionDate,
            p.SessionType,
            p.SessionDurationMinutes,
            p.EmotionalStateObserved,
            p.EmotionalStateEnd,
            p.SessionNarrative,
            p.InterventionsApplied,
            p.ProgressNoted,
            p.ConcernsFlagged,
            p.ReferralMade,
            p.FollowUpActions,
            p.SocialWorker,
            p.CreatedByUserId,
            // notes_restricted is sensitive — admin (any tier) only.
            NotesRestricted = canSeeNotes ? p.NotesRestricted : null,
            // Admins can modify any row in scope; Staff can only modify
            // rows they personally created. Legacy rows (null creator)
            // are admin-only.
            CanModify = scope.IsAdmin
                || (scope.IsStaff && p.CreatedByUserId != null && p.CreatedByUserId == userId)
        }).ToList();
    }

    // GET /api/processrecordings/5
    [HttpGet("{id}")]
    public async Task<ActionResult<object>> GetProcessRecording(int id)
    {
        var scope = await UserScope.FromPrincipalAsync(User, _users);

        var p = await _context.ProcessRecordings
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.RecordingId == id);
        if (p == null) return NotFound();

        if (!await CanAccessResidentAsync(p.ResidentId, scope)) return Forbid();

        var canSeeNotes = scope.IsAdmin;
        var userId = scope.UserId;
        return new
        {
            p.RecordingId,
            p.ResidentId,
            p.SessionDate,
            p.SessionType,
            p.SessionDurationMinutes,
            p.EmotionalStateObserved,
            p.EmotionalStateEnd,
            p.SessionNarrative,
            p.InterventionsApplied,
            p.ProgressNoted,
            p.ConcernsFlagged,
            p.ReferralMade,
            p.FollowUpActions,
            p.SocialWorker,
            p.CreatedByUserId,
            NotesRestricted = canSeeNotes ? p.NotesRestricted : null,
            CanModify = scope.IsAdmin
                || (scope.IsStaff && p.CreatedByUserId != null && p.CreatedByUserId == userId)
        };
    }

    // POST /api/processrecordings
    [HttpPost]
    public async Task<ActionResult<ProcessRecording>> CreateProcessRecording(
        [FromBody] ProcessRecording dto)
    {
        var scope = await UserScope.FromPrincipalAsync(User, _users);
        if (!await CanAccessResidentAsync(dto.ResidentId, scope)) return Forbid();

        // process_recordings has a non-identity PK in the canonical schema.
        var nextId = (await _context.ProcessRecordings.AnyAsync())
            ? await _context.ProcessRecordings.MaxAsync(p => p.RecordingId) + 1
            : 1;
        dto.RecordingId = nextId;
        dto.CreatedByUserId = scope.UserId;

        if (dto.SessionDate == null) dto.SessionDate = DateTime.UtcNow;

        _context.ProcessRecordings.Add(dto);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetProcessRecording),
            new { id = dto.RecordingId }, dto);
    }

    // PUT /api/processrecordings/5
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateProcessRecording(int id,
        [FromBody] ProcessRecording dto)
    {
        if (id != dto.RecordingId) return BadRequest();

        var scope = await UserScope.FromPrincipalAsync(User, _users);
        var existing = await _context.ProcessRecordings.AsNoTracking()
            .FirstOrDefaultAsync(p => p.RecordingId == id);
        if (existing == null) return NotFound();
        if (!await CanAccessResidentAsync(existing.ResidentId, scope)) return Forbid();
        if (existing.ResidentId != dto.ResidentId
            && !await CanAccessResidentAsync(dto.ResidentId, scope))
            return Forbid();

        // Staff can only edit recordings they personally created.
        if (scope.IsStaff && existing.CreatedByUserId != scope.UserId)
            return Forbid();

        // Preserve the original creator — don't let the PUT body overwrite it.
        dto.CreatedByUserId = existing.CreatedByUserId;

        _context.Entry(dto).State = EntityState.Modified;
        try { await _context.SaveChangesAsync(); }
        catch (DbUpdateConcurrencyException)
        {
            if (!await _context.ProcessRecordings.AnyAsync(p => p.RecordingId == id))
                return NotFound();
            throw;
        }
        return NoContent();
    }

    // DELETE /api/processrecordings/5  — Founders only.
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteProcessRecording(int id)
    {
        var scope = await UserScope.FromPrincipalAsync(User, _users);
        if (!scope.IsFounder) return Forbid();

        var p = await _context.ProcessRecordings.FindAsync(id);
        if (p == null) return NotFound();
        _context.ProcessRecordings.Remove(p);
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
