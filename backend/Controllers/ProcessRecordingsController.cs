using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Intex2026.Api.Data;
using Intex2026.Api.Models;

namespace Intex2026.Api.Controllers;

// Process Recording page (IS 413 requirement) — dated counseling session notes
// for each resident. Admin and Staff can read/create/update; Admin only can
// delete and see the `notes_restricted` field.
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Staff")]
public class ProcessRecordingsController : ControllerBase
{
    private readonly AppDbContext _context;

    public ProcessRecordingsController(AppDbContext context)
    {
        _context = context;
    }

    // GET /api/processrecordings?residentId=123
    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetProcessRecordings(
        [FromQuery] int? residentId)
    {
        var isAdmin = User.IsInRole("Admin");

        var query = _context.ProcessRecordings.AsNoTracking();
        if (residentId.HasValue)
            query = query.Where(p => p.ResidentId == residentId.Value);

        var list = await query
            .OrderByDescending(p => p.SessionDate)
            .ToListAsync();

        return list.Select(p => new
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
            // notes_restricted is sensitive — admin only
            NotesRestricted = isAdmin ? p.NotesRestricted : null
        }).ToList<object>();
    }

    // GET /api/processrecordings/5
    [HttpGet("{id}")]
    public async Task<ActionResult<object>> GetProcessRecording(int id)
    {
        var p = await _context.ProcessRecordings
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.RecordingId == id);
        if (p == null) return NotFound();

        var isAdmin = User.IsInRole("Admin");
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
            NotesRestricted = isAdmin ? p.NotesRestricted : null
        };
    }

    // POST /api/processrecordings
    [HttpPost]
    public async Task<ActionResult<ProcessRecording>> CreateProcessRecording(
        [FromBody] ProcessRecording dto)
    {
        // process_recordings has a non-identity PK in the canonical schema.
        // Generate the next id server-side so the client never has to supply one.
        var nextId = (await _context.ProcessRecordings.AnyAsync())
            ? await _context.ProcessRecordings.MaxAsync(p => p.RecordingId) + 1
            : 1;
        dto.RecordingId = nextId;

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

    // DELETE /api/processrecordings/5  (Admin only)
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteProcessRecording(int id)
    {
        var p = await _context.ProcessRecordings.FindAsync(id);
        if (p == null) return NotFound();
        _context.ProcessRecordings.Remove(p);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
