using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Intex2026.Api.Data;

namespace Intex2026.Api.Controllers;

/// <summary>
/// Public (anonymous) endpoints that power the marketing landing page.
/// These return only aggregated, non-sensitive data so no resident
/// information is ever exposed.
/// </summary>
[ApiController]
[Route("api/public")]
[AllowAnonymous]
public class PublicController : ControllerBase
{
    private readonly AppDbContext _context;

    public PublicController(AppDbContext context)
    {
        _context = context;
    }

    // GET /api/public/stats
    // Aggregated counts for the landing-page hero pills.
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var safehouseCount = await _context.Safehouses
            .AsNoTracking()
            .CountAsync();

        var girlsSupported = await _context.Residents
            .AsNoTracking()
            .CountAsync();

        var activeGirls = await _context.Residents
            .AsNoTracking()
            .Where(r => r.DateClosed == null)
            .CountAsync();

        // Rolling 12-month donor retention — identical calc to the admin
        // dashboard so the public number matches.
        var now = DateTime.UtcNow;
        var twelveMonthsAgo = now.AddMonths(-12);
        var twentyFourMonthsAgo = now.AddMonths(-24);

        var priorDonors = await _context.Donations
            .AsNoTracking()
            .Where(d => d.DonationDate != null
                        && d.DonationDate >= twentyFourMonthsAgo
                        && d.DonationDate < twelveMonthsAgo)
            .Select(d => d.SupporterId)
            .Distinct()
            .ToListAsync();

        var recentDonors = await _context.Donations
            .AsNoTracking()
            .Where(d => d.DonationDate != null && d.DonationDate >= twelveMonthsAgo)
            .Select(d => d.SupporterId)
            .Distinct()
            .ToListAsync();

        double retention = priorDonors.Count == 0
            ? 0
            : (double)priorDonors.Intersect(recentDonors).Count() / priorDonors.Count;

        return Ok(new
        {
            safehouseCount,
            girlsSupported,
            activeGirls,
            retentionRate = retention
        });
    }

    // GET /api/public/safehouses
    // Minimal safehouse list for the landing page — name, city, capacity,
    // and current occupancy only. No identifying resident info.
    [HttpGet("safehouses")]
    public async Task<IActionResult> GetSafehouses()
    {
        var rows = await (
            from sh in _context.Safehouses.AsNoTracking()
            join r in _context.Residents.AsNoTracking()
                on sh.SafehouseId equals r.SafehouseId into residentGroup
            from r in residentGroup.DefaultIfEmpty()
            group new { sh, r } by new
            {
                sh.SafehouseId,
                sh.Name,
                sh.City,
                sh.Region,
                sh.CapacityGirls,
                sh.CurrentOccupancy
            }
            into g
            select new
            {
                g.Key.SafehouseId,
                g.Key.Name,
                g.Key.City,
                g.Key.Region,
                Capacity = g.Key.CapacityGirls ?? 0,
                ActiveResidents = g.Count(x => x.r != null && x.r.DateClosed == null)
            }
        )
        .OrderBy(s => s.Name)
        .ToListAsync();

        return Ok(rows);
    }
}
