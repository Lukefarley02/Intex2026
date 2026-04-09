using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Intex2026.Api.Data;
using Intex2026.Api.Services;

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
                d.ChannelSource,
                // Notes carries the item description for in-kind donations
                // (e.g. "5 boxes of school supplies") so the donor portal
                // can render it alongside the gift.
                d.Notes
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

        var costPerGirl = await ImpactCalculator.GetCostPerGirlAsync(_context);

        if (supporter == null)
        {
            return Ok(new
            {
                total_donated = 0m,
                total_estimated_value = 0m,
                donation_count = 0,
                girls_helped = 0,
                months_of_care = 0,
                monthly_cost_per_girl = ImpactCalculator.MonthlyCostPerGirl(costPerGirl),
                cost_per_girl = costPerGirl,
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
                girls_helped = 0,
                months_of_care = 0,
                monthly_cost_per_girl = ImpactCalculator.MonthlyCostPerGirl(costPerGirl),
                cost_per_girl = costPerGirl,
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
            girls_helped           = ImpactCalculator.GirlsHelped(totalDonated, costPerGirl),
            months_of_care         = ImpactCalculator.MonthsOfCare(totalDonated, costPerGirl),
            monthly_cost_per_girl  = ImpactCalculator.MonthlyCostPerGirl(costPerGirl),
            cost_per_girl          = costPerGirl,
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
                d.Notes,
            })
            .ToListAsync();

        // Split into cash and non-cash per IRS Publication 1771. The cash
        // section states dollar amounts; the non-cash section lists item
        // descriptions only and does NOT state a dollar value on the
        // acknowledgment letter (the donor is responsible for valuing
        // non-cash gifts and must file Form 8283 for any single non-cash
        // gift whose fair-market value exceeds $500).
        static bool IsInKind(string? t) =>
            !string.IsNullOrWhiteSpace(t) &&
            (t.Equals("InKind", StringComparison.OrdinalIgnoreCase)
             || t.Equals("In-Kind", StringComparison.OrdinalIgnoreCase)
             || t.Equals("In Kind", StringComparison.OrdinalIgnoreCase));

        var cashDonations = donations
            .Where(d => !IsInKind(d.DonationType))
            .ToList();
        var nonCashDonations = donations
            .Where(d => IsInKind(d.DonationType))
            .ToList();

        var totalCashAmount = cashDonations.Sum(d => d.Amount ?? d.EstimatedValue ?? 0m);
        // Kept only for backwards compatibility with the older response
        // shape — includes every donation and was never technically correct
        // for in-kind gifts.
        var total = donations.Sum(d => d.Amount ?? d.EstimatedValue ?? 0m);

        // Form 8283 is required on the donor's tax return when any single
        // non-cash gift's claimed fair-market value exceeds $500. We flag
        // it here so the frontend can show the notice on the receipt.
        var form8283Required = nonCashDonations.Any(d => (d.EstimatedValue ?? 0m) > 500m);

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
                name       = "Ember Foundation",
                legalName  = "Ember Foundation, Inc.",
                ein        = "83-4721096",
                address1   = "1847 Bayanihan Street, Suite 3",
                address2   = "",
                city       = "Quezon City",
                state      = "Metro Manila",
                postalCode = "1100",
                country    = "Philippines",
                email      = "donations@emberfoundation.org",
                phone      = "+63 (2) 8-555-0174",
                website    = "https://emberfoundation.org",
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

            // Legacy totals — retained so any older frontend code still
            // renders something. New code should prefer `totalCashAmount`
            // and iterate the split arrays below.
            totalAmount   = total,
            donationCount = donations.Count,
            donations,

            // IRS Pub 1771 split ------------------------------------------
            //
            // Cash gifts carry a dollar value on the acknowledgment;
            // non-cash gifts list only the item description and an
            // "estimated value per donor" figure that the donor supplied
            // when the gift was logged. The receipt makes clear that the
            // donor — not the charity — is responsible for claiming the
            // valuation on their tax return.
            totalCashAmount,
            cashDonations,
            nonCashDonations,
            nonCashCount = nonCashDonations.Count,
            form8283Required,

            // Required IRS disclosure language for cash gifts. This is the
            // standard wording charities put at the bottom of their written
            // acknowledgment letters.
            disclosure = "No goods or services were provided in exchange for the contributions listed above. Please retain this acknowledgment for your tax records. Ember Foundation, Inc. is a registered 501(c)(3) nonprofit organization; contributions are tax-deductible to the fullest extent allowed by law.",
            nonCashDisclosure = "For non-cash (in-kind) contributions, the organization has described the items received but is not required (and is not permitted) to assign a dollar value for IRS purposes. The donor is solely responsible for determining the fair-market value of each item, and must file IRS Form 8283 (Noncash Charitable Contributions) with their return when the claimed value of any single item or group of similar items exceeds $500.",
            formReference = "Use this acknowledgment with IRS Schedule A (Form 1040) when itemizing charitable contributions. File Form 8283 alongside Schedule A for any non-cash gift whose fair-market value exceeds $500."
        });
    }
}
