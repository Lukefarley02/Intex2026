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
public class SupportersController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly UserManager<ApplicationUser> _users;

    public SupportersController(AppDbContext context, UserManager<ApplicationUser> users)
    {
        _context = context;
        _users = users;
    }

    // Per Appendix A of the case doc, supporter_type is one of:
    //   MonetaryDonor, InKindDonor, Volunteer, SkillsContributor,
    //   SocialMediaAdvocate, PartnerOrganization
    // The first two ("donors") are **read-only for Staff** — Staff can see
    // them but cannot create, edit, or delete them. All CRUD operations on
    // donor-type supporters are gated to Admin (Founder for delete).
    private static readonly string[] DonorTypes = { "MonetaryDonor", "InKindDonor" };
    private static readonly string[] NonDonorTypes =
        { "Volunteer", "SkillsContributor", "SocialMediaAdvocate", "PartnerOrganization" };

    // GET /api/supporters?types=MonetaryDonor,InKindDonor
    //
    // All authenticated roles (Founder / Regional Mgr / Location Mgr / Staff)
    // may read supporters of any type. Region scoping still applies via
    // UserScope.ApplyToSupporters — Staff and Location/Regional Managers
    // only see supporters in their assigned region.
    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetSupporters(
        [FromQuery] string? types = null)
    {
        var scope = await UserScope.FromPrincipalAsync(User, _users);

        // Parse type filter from the query string
        string[]? wanted = null;
        if (!string.IsNullOrWhiteSpace(types))
            wanted = types.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        // Region scope (admins below founder + staff are clamped here).
        var supportersQuery = scope.ApplyToSupporters(_context.Supporters.AsNoTracking());
        if (wanted != null && wanted.Length > 0)
        {
            var w = wanted;
            supportersQuery = supportersQuery.Where(s => w.Contains(s.SupporterType));
        }

        // LEFT JOIN donations via a group-join projection so supporters
        // with zero donations still appear.
        var rows = await (
            from s in supportersQuery
            join d in _context.Donations.AsNoTracking()
                on s.SupporterId equals d.SupporterId into donationGroup
            from d in donationGroup.DefaultIfEmpty()
            group new { s, d } by new
            {
                s.SupporterId,
                s.SupporterType,
                s.DisplayName,
                s.OrganizationName,
                s.FirstName,
                s.LastName,
                s.Email,
                s.Phone,
                s.Region,
                s.Country,
                s.RelationshipType,
                s.Status,
                s.AcquisitionChannel,
                s.CreatedAt,
                s.FirstDonationDate
            }
            into g
            select new
            {
                g.Key.SupporterId,
                g.Key.SupporterType,
                g.Key.DisplayName,
                g.Key.OrganizationName,
                g.Key.FirstName,
                g.Key.LastName,
                g.Key.Email,
                g.Key.Phone,
                g.Key.Region,
                g.Key.Country,
                g.Key.RelationshipType,
                g.Key.Status,
                g.Key.AcquisitionChannel,
                g.Key.CreatedAt,
                g.Key.FirstDonationDate,
                TotalDonated = g.Sum(x =>
                    x.d == null ? 0m : (x.d.Amount ?? x.d.EstimatedValue ?? 0m)),
                DonationCount = g.Count(x => x.d != null),
                LastGiftDate = g.Max(x => x.d == null ? (DateTime?)null : x.d.DonationDate)
            }
        )
        .OrderByDescending(r => r.TotalDonated)
        .ThenBy(r => r.DisplayName)
        .ToListAsync();

        return Ok(rows);
    }

    // GET /api/supporters/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<object>> GetSupporter(int id)
    {
        var scope = await UserScope.FromPrincipalAsync(User, _users);

        var supporter = await _context.Supporters
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.SupporterId == id);

        if (supporter == null) return NotFound();

        if (!IsVisibleTo(supporter, scope)) return Forbid();
        return Ok(supporter);
    }

    // POST /api/supporters
    //
    // Donor-type supporters (MonetaryDonor / InKindDonor) are Admin-only.
    // Staff may still create non-donor supporters (volunteers, partner orgs,
    // etc.) inside their region.
    [HttpPost]
    public async Task<ActionResult<Supporter>> CreateSupporter(Supporter supporter)
    {
        var scope = await UserScope.FromPrincipalAsync(User, _users);

        if (scope.IsStaff && DonorTypes.Contains(supporter.SupporterType))
            return Forbid(); // staff cannot create donors

        if (!IsVisibleTo(supporter, scope)) return Forbid();

        _context.Supporters.Add(supporter);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetSupporter), new { id = supporter.SupporterId }, supporter);
    }

    // PUT /api/supporters/{id}
    //
    // Donor-type supporters are Admin-only for edits as well — Staff who
    // open a donor record see a read-only view with no save button, but
    // this check is the authoritative backend enforcement.
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateSupporter(int id, Supporter supporter)
    {
        if (id != supporter.SupporterId) return BadRequest();
        var scope = await UserScope.FromPrincipalAsync(User, _users);

        var existing = await _context.Supporters.AsNoTracking()
            .FirstOrDefaultAsync(s => s.SupporterId == id);
        if (existing == null) return NotFound();

        // Staff cannot edit donor-type supporters — view-only.
        if (scope.IsStaff && (
                DonorTypes.Contains(existing.SupporterType) ||
                DonorTypes.Contains(supporter.SupporterType)))
            return Forbid();

        if (!IsVisibleTo(existing, scope)) return Forbid();
        if (!IsVisibleTo(supporter, scope)) return Forbid(); // can't move out of scope

        _context.Entry(supporter).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // DELETE /api/supporters/{id}  — Founders only.
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteSupporter(int id)
    {
        var scope = await UserScope.FromPrincipalAsync(User, _users);
        if (!scope.IsFounder) return Forbid();

        var supporter = await _context.Supporters.FindAsync(id);
        if (supporter == null) return NotFound();
        _context.Supporters.Remove(supporter);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // ── Visibility helper ─────────────────────────────────────────────────────
    // Read-side visibility: Staff CAN see donor-type supporters (view-only);
    // write-side gating is done inline in Create/Update/Delete above.
    private static bool IsVisibleTo(Supporter s, UserScope scope)
    {
        if (scope.IsFounder) return true;

        // Regional Manager / Location Manager / Staff: scoped by region only
        // (the supporters table has no city column).
        if (scope.Region == null) return false;
        return string.Equals(s.Region, scope.Region, StringComparison.OrdinalIgnoreCase);
    }
}
