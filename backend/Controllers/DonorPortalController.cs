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

    // GET /api/donorportal/me/tax-receipt?year=YYYY
    //
    // Returns everything the front-end needs to render a printable
    // 501(c)(3) written acknowledgment letter — the document the IRS
    // expects a US donor to keep for cash contributions when itemizing
    // on Schedule A of Form 1040. This is not a specific numbered IRS
    // form; it is the standard donation receipt letter every US charity
    // issues. (Form 8283 only applies to non-cash gifts over $500, which
    // this flow does not collect.)
    //
    // Response shape deliberately mirrors what a tax-year acknowledgment
    // would need:
    //   - org block (name, EIN placeholder, address, contact)
    //   - donor block (name, email, address)
    //   - tax year, issue date, per-gift line items, total
    //   - IRS disclosure ("no goods or services were provided")
    [HttpGet("me/tax-receipt")]
    public async Task<IActionResult> GetTaxReceipt([FromQuery] int? year = null)
    {
        var email = User.FindFirstValue(ClaimTypes.Email);
        if (string.IsNullOrEmpty(email))
            return Unauthorized();

        var supporter = await _context.Supporters
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Email == email);

        if (supporter == null)
            return NotFound(new { message = "No supporter record found for this account." });

        var targetYear = year ?? DateTime.UtcNow.Year;
        var yearStart  = new DateTime(targetYear, 1, 1);
        var yearEnd    = new DateTime(targetYear + 1, 1, 1);

        var donations = await _context.Donations
            .AsNoTracking()
            .Where(d => d.SupporterId == supporter.SupporterId
                     && d.DonationDate != null
                     && d.DonationDate >= yearStart
                     && d.DonationDate < yearEnd)
            .OrderBy(d => d.DonationDate)
            .Select(d => new
            {
                d.DonationId,
                d.DonationDate,
                d.DonationType,
                d.Amount,
                d.EstimatedValue,
                d.CampaignName,
                d.IsRecurring,
                d.CurrencyCode,
            })
            .ToListAsync();

        var total = donations.Sum(d => d.Amount ?? d.EstimatedValue ?? 0m);

        // Available years — helps the UI build a year dropdown.
        // Done as a separate projection outside SQL to avoid EF Core
        // struggling to translate DateTime.Year on a nullable property.
        var allDates = await _context.Donations
            .AsNoTracking()
            .Where(d => d.SupporterId == supporter.SupporterId && d.DonationDate != null)
            .Select(d => d.DonationDate!.Value)
            .ToListAsync();
        var availableYears = allDates
            .Select(d => d.Year)
            .Distinct()
            .OrderByDescending(y => y)
            .ToList();

        var displayName = !string.IsNullOrWhiteSpace(supporter.DisplayName)
            ? supporter.DisplayName
            : $"{supporter.FirstName} {supporter.LastName}".Trim();

        return Ok(new
        {
            // Organization block — placeholder values until the real org
            // name and EIN are provided by the INTEX team.
            organization = new
            {
                name       = "Ember (Lighthouse Project)",
                legalName  = "Ember Nonprofit, Inc.",
                ein        = "XX-XXXXXXX",                    // placeholder; fill in before go-live
                address1   = "[Org street address]",
                address2   = "",
                city       = "[City]",
                state      = "[State]",
                postalCode = "[ZIP]",
                country    = "United States",
                email      = "donations@ember.org",
                phone      = "+1 (555) 555-0100",
                website    = "https://ember.org",
            },

            // Donor block
            donor = new
            {
                supporter.SupporterId,
                displayName,
                supporter.FirstName,
                supporter.LastName,
                supporter.Email,
                supporter.Country,
                supporter.Region,
            },

            taxYear       = targetYear,
            availableYears,
            issueDate     = DateTime.UtcNow,
            currencyCode  = "USD",
            totalAmount   = total,
            donationCount = donations.Count,
            donations,

            // Required IRS disclosure language for cash gifts. This is the
            // standard wording charities put at the bottom of their written
            // acknowledgment letters.
            disclosure = "No goods or services were provided in exchange for the contributions listed above. Please retain this acknowledgment for your tax records. Ember is a registered 501(c)(3) nonprofit organization; contributions are tax-deductible to the fullest extent allowed by law.",
            formReference = "Use this acknowledgment with IRS Schedule A (Form 1040) when itemizing charitable contributions."
        });
    }
}
