using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Intex2026.Api.Data;

namespace Intex2026.Api.Controllers;

/// <summary>
/// Read-only campaign rollups derived from the donations table. There is no
/// dedicated campaigns table in the current schema, so campaigns are defined
/// as the distinct non-empty campaign_name values, with amounts aggregated
/// live from donations. Goals are not stored in the database, so a
/// placeholder goal is computed (1.5× raised, rounded up to a round number)
/// purely for visualization.
/// </summary>
[ApiController]
[Route("api/campaigns")]
[Authorize] // any authenticated user (Admin, Staff, or Donor) can read
public class CampaignsController : ControllerBase
{
    private readonly AppDbContext _context;

    public CampaignsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetCampaigns()
    {
        var rollups = await _context.Donations
            .AsNoTracking()
            .Where(d => d.CampaignName != null && d.CampaignName != "")
            .GroupBy(d => d.CampaignName!)
            .Select(g => new
            {
                name = g.Key,
                raised = g.Sum(d => (decimal?)(d.Amount ?? d.EstimatedValue ?? 0m)) ?? 0m,
                donationCount = g.Count(),
                mostRecent = g.Max(d => d.DonationDate)
            })
            .OrderByDescending(c => c.raised)
            .Take(10)
            .ToListAsync();

        var campaigns = rollups.Select(c =>
        {
            // Placeholder goal: next round number above 1.5× raised (to $5k)
            var rawGoal = (double)c.raised * 1.5;
            var goal = rawGoal <= 0
                ? 5000m
                : (decimal)(Math.Ceiling(rawGoal / 5000.0) * 5000.0);

            return new
            {
                c.name,
                description = $"Supporting our mission through the {c.name} initiative.",
                c.raised,
                goal,
                c.donationCount,
                endDate = c.mostRecent.HasValue
                    ? c.mostRecent.Value.AddMonths(3).ToString("yyyy-MM-dd")
                    : null
            };
        });

        return Ok(campaigns);
    }
}
