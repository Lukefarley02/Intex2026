using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Intex2026.Api.Data;
using Intex2026.Api.Models;

namespace Intex2026.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Staff")]
public class SupportersController : ControllerBase
{
    private readonly AppDbContext _context;

    public SupportersController(AppDbContext context)
    {
        _context = context;
    }

    // Per Appendix A of the case doc, supporter_type is one of:
    //   MonetaryDonor, InKindDonor, Volunteer, SkillsContributor,
    //   SocialMediaAdvocate, PartnerOrganization
    // By convention a "donor" is the first two.
    private static readonly string[] DonorTypes = { "MonetaryDonor", "InKindDonor" };

    // GET /api/supporters?types=MonetaryDonor,InKindDonor
    //
    // Returns the supporters table with per-supporter donation aggregates
    // joined in (total donated, donation count, most recent gift). The
    // optional `types` query parameter is a comma-separated list of
    // supporter_type values; when omitted, all six types are returned so
    // callers can do their own client-side filtering.
    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetSupporters(
        [FromQuery] string? types = null)
    {
        // Parse type filter
        string[]? wanted = null;
        if (!string.IsNullOrWhiteSpace(types))
        {
            wanted = types.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        }

        var supportersQuery = _context.Supporters.AsNoTracking().AsQueryable();
        if (wanted != null && wanted.Length > 0)
        {
            supportersQuery = supportersQuery.Where(s => wanted.Contains(s.SupporterType));
        }

        // LEFT JOIN donations via a group-join projection so suppliers
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
        var supporter = await _context.Supporters
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.SupporterId == id);

        if (supporter == null) return NotFound();
        return Ok(supporter);
    }

    // POST /api/supporters
    [HttpPost]
    public async Task<ActionResult<Supporter>> CreateSupporter(Supporter supporter)
    {
        _context.Supporters.Add(supporter);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetSupporter), new { id = supporter.SupporterId }, supporter);
    }

    // PUT /api/supporters/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateSupporter(int id, Supporter supporter)
    {
        if (id != supporter.SupporterId) return BadRequest();
        _context.Entry(supporter).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // DELETE /api/supporters/{id}
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteSupporter(int id)
    {
        var supporter = await _context.Supporters.FindAsync(id);
        if (supporter == null) return NotFound();
        _context.Supporters.Remove(supporter);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
