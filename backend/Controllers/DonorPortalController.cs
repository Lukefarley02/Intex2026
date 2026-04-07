using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Intex2026.Api.Data;

namespace Intex2026.Api.Controllers;

[ApiController]
[Route("api/donorportal")]
[Authorize(Roles = "Donor")]
public class DonorPortalController : ControllerBase
{
    private readonly AppDbContext _context;

    public DonorPortalController(AppDbContext context)
    {
        _context = context;
    }

    // GET /api/donorportal/me
    // Returns the current donor's supporter profile (no notes_restricted — not present on Supporter model).
    [HttpGet("me")]
    public async Task<IActionResult> GetMyProfile()
    {
        var email = User.FindFirstValue(ClaimTypes.Email);
        if (string.IsNullOrEmpty(email))
            return Unauthorized();

        var supporter = await _context.Supporters
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Email == email);

        if (supporter == null)
            return NotFound(new { message = "No supporter record found for this account." });

        return Ok(new
        {
            supporter.SupporterId,
            supporter.SupporterType,
            supporter.DisplayName,
            supporter.OrganizationName,
            supporter.FirstName,
            supporter.LastName,
            supporter.RelationshipType,
            supporter.Region,
            supporter.Country,
            supporter.Email,
            supporter.Phone,
            supporter.Status,
            supporter.CreatedAt,
            supporter.FirstDonationDate,
            supporter.AcquisitionChannel
        });
    }

    // GET /api/donorportal/me/donations
    // Returns the current donor's full donation history, most recent first.
    [HttpGet("me/donations")]
    public async Task<IActionResult> GetMyDonations()
    {
        var email = User.FindFirstValue(ClaimTypes.Email);
        if (string.IsNullOrEmpty(email))
            return Unauthorized();

        var supporter = await _context.Supporters
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Email == email);

        if (supporter == null)
            return Ok(Array.Empty<object>());

        var donations = await _context.Donations
            .AsNoTracking()
            .Where(d => d.SupporterId == supporter.SupporterId)
            .OrderByDescending(d => d.DonationDate)
            .Select(d => new
            {
                d.DonationId,
                d.DonationType,
                d.DonationDate,
                d.Amount,
                d.EstimatedValue,
                d.ImpactUnit,
                d.CampaignName,
                d.IsRecurring,
                d.ChannelSource
            })
            .ToListAsync();

        return Ok(donations);
    }

    // GET /api/donorportal/me/impact
    // Returns aggregated giving stats for the current donor.
    [HttpGet("me/impact")]
    public async Task<IActionResult> GetMyImpact()
    {
        var email = User.FindFirstValue(ClaimTypes.Email);
        if (string.IsNullOrEmpty(email))
            return Unauthorized();

        var supporter = await _context.Supporters
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Email == email);

        if (supporter == null)
        {
            return Ok(new
            {
                total_donated = 0m,
                total_estimated_value = 0m,
                donation_count = 0,
                first_donation_date = (DateTime?)null,
                most_recent_donation_date = (DateTime?)null,
                campaigns_supported = Array.Empty<string>()
            });
        }

        var donations = await _context.Donations
            .AsNoTracking()
            .Where(d => d.SupporterId == supporter.SupporterId)
            .ToListAsync();

        if (donations.Count == 0)
        {
            return Ok(new
            {
                total_donated = 0m,
                total_estimated_value = 0m,
                donation_count = 0,
                first_donation_date = (DateTime?)null,
                most_recent_donation_date = (DateTime?)null,
                campaigns_supported = Array.Empty<string>()
            });
        }

        var totalDonated       = donations.Sum(d => d.Amount ?? 0m);
        var totalEstimated     = donations.Sum(d => d.EstimatedValue ?? 0m);
        var donationCount      = donations.Count;
        var firstDate          = donations.Min(d => d.DonationDate);
        var mostRecentDate     = donations.Max(d => d.DonationDate);
        var campaigns          = donations
                                    .Where(d => !string.IsNullOrWhiteSpace(d.CampaignName))
                                    .Select(d => d.CampaignName!)
                                    .Distinct()
                                    .OrderBy(c => c)
                                    .ToArray();

        return Ok(new
        {
            total_donated          = totalDonated,
            total_estimated_value  = totalEstimated,
            donation_count         = donationCount,
            first_donation_date    = firstDate,
            most_recent_donation_date = mostRecentDate,
            campaigns_supported    = campaigns
        });
    }
}
