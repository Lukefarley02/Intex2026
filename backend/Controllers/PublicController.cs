using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Intex2026.Api.Data;
using Intex2026.Api.Models;

namespace Intex2026.Api.Controllers;

// Payload for POST /api/public/donate — accepted anonymously from the
// public Donate page. If IsAnonymous is true, FirstName/LastName/Email are
// ignored and a synthetic "anonymous-<guid>@ember.local" supporter is used.
public record PublicDonateRequest(
    string? FirstName,
    string? LastName,
    string? Email,
    decimal Amount,
    bool Monthly,
    bool IsAnonymous,
    string? CampaignName);

public record PublicDonateResponse(
    int DonationId,
    int SupporterId,
    string Email,
    bool CreatedNewSupporter,
    bool IsAnonymous);

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

        // Active = canonical case_status value from lighthouse_schema.sql
        // (two-value enum: 'Active' / 'Closed'). Must match SafehousesController
        // so the public landing page and the admin safehouses page agree.
        var activeGirls = await _context.Residents
            .AsNoTracking()
            .Where(r => r.CaseStatus == "Active")
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

        var reintegratedGirls = await _context.Residents
            .AsNoTracking()
            .Where(r => r.ReintegrationStatus != null && r.ReintegrationStatus != "")
            .CountAsync();

        var totalRaised = await _context.Donations
            .AsNoTracking()
            .SumAsync(d => (decimal?)(d.Amount ?? d.EstimatedValue ?? 0m)) ?? 0m;

        return Ok(new
        {
            safehouseCount,
            girlsSupported,
            activeGirls,
            reintegratedGirls,
            totalRaised,
            retentionRate = retention
        });
    }

    // GET /api/public/donations
    // Returns total donations raised and a breakdown by campaign for the
    // landing page donut chart. No donor names or personal data included.
    [HttpGet("donations")]
    public async Task<IActionResult> GetDonations()
    {
        var all = await _context.Donations.AsNoTracking().ToListAsync();

        var totalRaised = all.Sum(d => d.Amount ?? d.EstimatedValue ?? 0m);

        var byCampaign = all
            .Where(d => !string.IsNullOrWhiteSpace(d.CampaignName))
            .GroupBy(d => d.CampaignName!)
            .Select(g => new
            {
                name = g.Key,
                amount = g.Sum(d => d.Amount ?? d.EstimatedValue ?? 0m)
            })
            .OrderByDescending(c => c.amount)
            .Take(6)
            .ToList();

        // Bucket everything else into "Other"
        var topTotal = byCampaign.Sum(c => c.amount);
        var other = totalRaised - topTotal;

        var breakdown = byCampaign.Cast<object>().ToList();
        if (other > 0)
            breakdown.Add(new { name = "Other", amount = other });

        return Ok(new { totalRaised, breakdown });
    }

    // GET /api/public/care-story
    // Aggregated care metrics that tell the story of how each girl is supported.
    // Returns only counts and rates — no resident-identifying information.
    [HttpGet("care-story")]
    public async Task<IActionResult> GetCareStory()
    {
        var totalCounselingSessions = await _context.ProcessRecordings
            .AsNoTracking()
            .CountAsync();

        var totalHomeVisits = await _context.HomeVisitations
            .AsNoTracking()
            .CountAsync();

        // % of counseling sessions where progress was noted
        var sessionsWithProgress = await _context.ProcessRecordings
            .AsNoTracking()
            .CountAsync(r => r.ProgressNoted == true);

        double progressRate = totalCounselingSessions == 0
            ? 0
            : (double)sessionsWithProgress / totalCounselingSessions;

        // % of sessions ending on a positive emotional note
        var positiveEndStates = new[] { "Hopeful", "Calm", "Happy", "Content", "Stable", "Motivated", "Relieved", "Confident", "Peaceful" };
        var sessionsEndingPositively = await _context.ProcessRecordings
            .AsNoTracking()
            .CountAsync(r => r.EmotionalStateEnd != null && positiveEndStates.Contains(r.EmotionalStateEnd));

        var sessionsWithEndState = await _context.ProcessRecordings
            .AsNoTracking()
            .CountAsync(r => r.EmotionalStateEnd != null);

        double positiveEndRate = sessionsWithEndState == 0
            ? 0
            : (double)sessionsEndingPositively / sessionsWithEndState;

        // % of home visits with a favorable outcome
        var favorableVisits = await _context.HomeVisitations
            .AsNoTracking()
            .CountAsync(v => v.VisitOutcome == "Favorable");

        var visitsWithOutcome = await _context.HomeVisitations
            .AsNoTracking()
            .CountAsync(v => v.VisitOutcome != null);

        double favorableVisitRate = visitsWithOutcome == 0
            ? 0
            : (double)favorableVisits / visitsWithOutcome;

        // Girls who improved from Critical/High risk to Medium/Low risk
        var highRiskLevels = new[] { "Critical", "High" };
        var lowRiskLevels = new[] { "Medium", "Low" };

        var girlsRiskImproved = await _context.Residents
            .AsNoTracking()
            .CountAsync(r =>
                r.InitialRiskLevel != null &&
                r.CurrentRiskLevel != null &&
                highRiskLevels.Contains(r.InitialRiskLevel) &&
                lowRiskLevels.Contains(r.CurrentRiskLevel));

        return Ok(new
        {
            totalCounselingSessions,
            totalHomeVisits,
            progressRate,
            positiveEndRate,
            favorableVisitRate,
            girlsRiskImproved
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
                ActiveResidents = g.Count(x => x.r != null && x.r.CaseStatus == "Active")
            }
        )
        .OrderBy(s => s.Name)
        .ToListAsync();

        return Ok(rows);
    }

    // POST /api/public/donate
    // Anonymous-friendly donation intake used by the public Donate page.
    //
    // Flow:
    //   1) If IsAnonymous is true we mint a throwaway supporter
    //      ("Anonymous Donor" display name, synthetic email) so the FK on
    //      donations.supporter_id stays valid without leaking any PII.
    //   2) Otherwise we look up the supporter by email (case-insensitive).
    //      If none exists we create a new MonetaryDonor row. If one does
    //      exist we reuse it — this lets a returning donor who later creates
    //      an account see *all* of their historical gifts in the donor portal
    //      automatically (DonorPortalController matches by email).
    //   3) Insert a Donation row. Both `supporter_id` and `donation_id` are
    //      non-identity INT PKs in the canonical schema, so we generate the
    //      next IDs server-side (same pattern as ProcessRecordings /
    //      HomeVisitations).
    //
    // No real payment processing — this is a capstone demo. The front-end
    // pretends to take a card; we just record the row.
    [HttpPost("donate")]
    public async Task<ActionResult<PublicDonateResponse>> CreateDonation([FromBody] PublicDonateRequest req)
    {
        if (req.Amount <= 0)
            return BadRequest(new { message = "Donation amount must be greater than zero." });

        string email;
        string firstName;
        string lastName;
        string displayName;
        bool anonymous = req.IsAnonymous;

        if (anonymous)
        {
            // Synthetic, non-routable email so we never collide with a real
            // supporter and so the donor portal's email-match never finds it.
            email       = $"anonymous-{Guid.NewGuid():N}@ember.local";
            firstName   = "Anonymous";
            lastName    = "Donor";
            displayName = "Anonymous Donor";
        }
        else
        {
            if (string.IsNullOrWhiteSpace(req.Email))
                return BadRequest(new { message = "Email is required unless donating anonymously." });

            email     = req.Email.Trim();
            firstName = string.IsNullOrWhiteSpace(req.FirstName) ? "Donor" : req.FirstName.Trim();
            lastName  = string.IsNullOrWhiteSpace(req.LastName)  ? ""      : req.LastName.Trim();
            displayName = string.IsNullOrWhiteSpace(lastName)
                ? firstName
                : $"{firstName} {lastName}".Trim();
        }

        // Look up existing supporter by email (never for anonymous donations)
        Supporter? supporter = null;
        bool createdNewSupporter = false;
        if (!anonymous)
        {
            supporter = await _context.Supporters
                .FirstOrDefaultAsync(s => s.Email == email);
        }

        if (supporter == null)
        {
            var nextSupporterId = (await _context.Supporters.AnyAsync())
                ? await _context.Supporters.MaxAsync(s => s.SupporterId) + 1
                : 1;

            supporter = new Supporter
            {
                SupporterId        = nextSupporterId,
                SupporterType      = "MonetaryDonor",
                DisplayName        = displayName,
                FirstName          = firstName,
                LastName           = lastName,
                Email              = email,
                Region             = "Online",          // placeholder region for self-service gifts
                Country            = "United States",  // default for US-facing donate flow
                RelationshipType   = "Individual",
                Status             = anonymous ? "Anonymous" : "Active",
                AcquisitionChannel = "Website",
                CreatedAt          = DateTime.UtcNow,
                FirstDonationDate  = DateTime.UtcNow,
            };
            _context.Supporters.Add(supporter);
            await _context.SaveChangesAsync();
            createdNewSupporter = true;
        }

        // Generate the next donation_id (non-identity PK)
        var nextDonationId = (await _context.Donations.AnyAsync())
            ? await _context.Donations.MaxAsync(d => d.DonationId) + 1
            : 1;

        var donation = new Donation
        {
            DonationId    = nextDonationId,
            SupporterId   = supporter.SupporterId,
            DonationType  = "Monetary",
            Amount        = req.Amount,
            EstimatedValue = req.Amount,
            DonationDate  = DateTime.UtcNow,
            CurrencyCode  = "USD",
            IsRecurring   = req.Monthly,
            CampaignName  = string.IsNullOrWhiteSpace(req.CampaignName) ? "General Fund" : req.CampaignName,
            ChannelSource = "Website",
            ImpactUnit    = "USD",
            Notes         = anonymous ? "Anonymous online donation" : "Online donation via /donate",
        };
        _context.Donations.Add(donation);
        await _context.SaveChangesAsync();

        return Ok(new PublicDonateResponse(
            DonationId: donation.DonationId,
            SupporterId: supporter.SupporterId,
            Email: anonymous ? string.Empty : email,
            CreatedNewSupporter: createdNewSupporter,
            IsAnonymous: anonymous));
    }
}
