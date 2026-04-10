using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Intex2026.Api.Authorization;
using Intex2026.Api.Data;
using Intex2026.Api.Models;

namespace Intex2026.Api.Controllers;

/// <summary>
/// Returns only the reports (process recordings + home visitations) created
/// by the currently authenticated user. Used by the "My Reports" page so
/// Staff can see a consolidated view of their own work.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Staff")]
public class MyReportsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly UserManager<ApplicationUser> _users;

    public MyReportsController(AppDbContext context, UserManager<ApplicationUser> users)
    {
        _context = context;
        _users = users;
    }

    // GET /api/myreports/process-recordings
    [HttpGet("process-recordings")]
    public async Task<ActionResult<IEnumerable<object>>> GetMyProcessRecordings()
    {
        var scope = await UserScope.FromPrincipalAsync(User, _users);
        if (scope.UserId == null) return Unauthorized();

        var list = await _context.ProcessRecordings.AsNoTracking()
            .Where(p => p.CreatedByUserId == scope.UserId)
            .OrderByDescending(p => p.SessionDate)
            .ToListAsync();

        var canSeeNotes = scope.IsAdmin;
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
            NotesRestricted = canSeeNotes ? p.NotesRestricted : null,
            CanModify = true // always your own records
        }).ToList();
    }

    // GET /api/myreports/home-visitations
    [HttpGet("home-visitations")]
    public async Task<ActionResult<IEnumerable<object>>> GetMyHomeVisitations()
    {
        var scope = await UserScope.FromPrincipalAsync(User, _users);
        if (scope.UserId == null) return Unauthorized();

        var list = await _context.HomeVisitations.AsNoTracking()
            .Where(v => v.CreatedByUserId == scope.UserId)
            .OrderByDescending(v => v.VisitDate)
            .ToListAsync();

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
            CanModify = true
        }).ToList();
    }
}
