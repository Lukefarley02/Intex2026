using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Intex2026.Api.Data;
using Intex2026.Api.Models;

namespace Intex2026.Api.Controllers;

// Home Visitation & Case Conferences page (IS 413 requirement) — logs of
// home and field visits for each resident plus upcoming/past case conferences.
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Staff")]
public class HomeVisitationsController : ControllerBase
{
    private readonly AppDbContext _context;

    public HomeVisitationsController(AppDbContext context)
    {
        _context = context;
    }

    // GET /api/homevisitations?residentId=123
    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetHomeVisitations(
        [FromQuery] int? residentId)
    {
        var query = _context.HomeVisitations.AsNoTracking();
        if (residentId.HasValue)
            query = query.Where(v => v.ResidentId == residentId.Value);

        var list = await query
            .OrderByDescending(v => v.VisitDate)
            .ToListAsync();

        return list.Select(v => new
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
            v.SocialWorker
        }).ToList<object>();
    }

    // GET /api/homevisitations/5
    [HttpGet("{id}")]
    public async Task<ActionResult<HomeVisitation>> GetHomeVisitation(int id)
    {
        var v = await _context.HomeVisitations
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.VisitationId == id);
        if (v == null) return NotFound();
        return v;
    }

    // POST /api/homevisitations
    [HttpPost]
    public async Task<ActionResult<HomeVisitation>> CreateHomeVisitation(
        [FromBody] HomeVisitation dto)
    {
        var nextId = (await _context.HomeVisitations.AnyAsync())
            ? await _context.HomeVisitations.MaxAsync(v => v.VisitationId) + 1
            : 1;
        dto.VisitationId = nextId;

        if (dto.VisitDate == null) dto.VisitDate = DateTime.UtcNow;

        _context.HomeVisitations.Add(dto);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetHomeVisitation),
            new { id = dto.VisitationId }, dto);
    }

    // PUT /api/homevisitations/5
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateHomeVisitation(int id,
        [FromBody] HomeVisitation dto)
    {
        if (id != dto.VisitationId) return BadRequest();
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

    // DELETE /api/homevisitations/5  (Admin only)
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteHomeVisitation(int id)
    {
        var v = await _context.HomeVisitations.FindAsync(id);
        if (v == null) return NotFound();
        _context.HomeVisitations.Remove(v);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
