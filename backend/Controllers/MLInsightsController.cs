using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Intex2026.Api.Data;

namespace Intex2026.Api.Controllers;

/// <summary>
/// ML-derived insight KPIs for the admin dashboard.
/// All metrics are computed from live Azure SQL data using rules derived
/// from the Python ML pipelines (see ml-pipelines/ in the repo root).
/// </summary>
[ApiController]
[Route("api/mlinsights")]
[Authorize(Roles = "Admin,Staff")]
public class MLInsightsController : ControllerBase
{
    private readonly AppDbContext _context;

    // Types that count as "donors" for pipeline 01/02 logic
    private static readonly string[] DonorTypes = { "MonetaryDonor", "InKindDonor" };

    public MLInsightsController(AppDbContext context)
    {
        _context = context;
    }

    // GET /api/mlinsights
    // Returns four ML-proxy KPIs shown on the admin dashboard insights row.
    //
    // 1. atRiskDonorCount   (Pipeline 01 proxy) — monetary donors whose last gift was
    //    > 90 days ago (churn risk threshold from donor churn model).
    //
    // 2. upgradeOpportunityCount  (Pipeline 02 proxy) — recurring monetary donors
    //    whose max past donation is > 1.5× their average (headroom detected).
    //
    // 3. residentsReadyCount  (Pipeline 04 proxy) — active residents with
    //    current_risk_level = 'Low' (reintegration-ready threshold).
    //
    // 4. safehousesNearCapacity  (Pipeline 05 proxy) — safehouses at ≥ 90% occupancy
    //    based on live resident count vs capacity_girls.
    [HttpGet]
    public async Task<IActionResult> GetInsights()
    {
        var now = DateTime.UtcNow;
        var ninetyDaysAgo = now.AddDays(-90);

        // ── 1. At-Risk Donors ──────────────────────────────────────────────────
        // Find monetary donors whose most recent monetary donation is older than 90 days.
        var latestMonetaryGift = await _context.Donations
            .AsNoTracking()
            .Where(d => d.DonationType == "Monetary" && d.DonationDate.HasValue)
            .GroupBy(d => d.SupporterId)
            .Select(g => new
            {
                SupporterId = g.Key,
                LastGift = g.Max(d => d.DonationDate)
            })
            .ToListAsync();

        var donorSupporterIds = await _context.Supporters
            .AsNoTracking()
            .Where(s => DonorTypes.Contains(s.SupporterType))
            .Select(s => s.SupporterId)
            .ToHashSetAsync();

        int atRiskDonorCount = latestMonetaryGift
            .Count(d => donorSupporterIds.Contains(d.SupporterId)
                        && d.LastGift < ninetyDaysAgo);

        // ── 2. Upgrade Opportunities ───────────────────────────────────────────
        // Recurring donors whose giving pattern suggests capacity headroom:
        // max_donation > 1.5 × avg_donation (i.e. they can give more but haven't been asked).
        var donorGivingStats = await _context.Donations
            .AsNoTracking()
            .Where(d => d.DonationType == "Monetary" && d.Amount.HasValue && d.IsRecurring == true)
            .GroupBy(d => d.SupporterId)
            .Select(g => new
            {
                SupporterId = g.Key,
                AvgDonation = g.Average(d => d.Amount),
                MaxDonation = g.Max(d => d.Amount),
                DonationCount = g.Count()
            })
            .ToListAsync();

        int upgradeOpportunityCount = donorGivingStats
            .Count(d => donorSupporterIds.Contains(d.SupporterId)
                        && d.DonationCount >= 2
                        && d.AvgDonation.HasValue && d.MaxDonation.HasValue
                        && d.MaxDonation > d.AvgDonation * 1.5m);

        // ── 3. Residents Ready for Reintegration ──────────────────────────────
        // Active residents classified as Low risk — the ML pipeline identifies
        // these as the most reintegration-ready cohort.
        int residentsReadyCount = await _context.Residents
            .AsNoTracking()
            .Where(r => r.CaseStatus == "Active"
                        && r.CurrentRiskLevel != null
                        && r.CurrentRiskLevel.ToLower() == "low")
            .CountAsync();

        // ── 4. Safehouses Near Capacity ───────────────────────────────────────
        // Safehouses where live resident count ≥ 90% of capacity_girls.
        // Matches the geographic pipeline's overcrowding alert threshold.
        var safehouseCapacities = await _context.Safehouses
            .AsNoTracking()
            .Where(s => s.CapacityGirls.HasValue && s.CapacityGirls > 0)
            .Select(s => new { s.SafehouseId, s.CapacityGirls })
            .ToListAsync();

        var residentCounts = await _context.Residents
            .AsNoTracking()
            .Where(r => r.CaseStatus == "Active")
            .GroupBy(r => r.SafehouseId)
            .Select(g => new { SafehouseId = g.Key, ActiveCount = g.Count() })
            .ToListAsync();

        var residentCountLookup = residentCounts.ToDictionary(x => x.SafehouseId, x => x.ActiveCount);

        int safehousesNearCapacity = safehouseCapacities
            .Count(s =>
            {
                residentCountLookup.TryGetValue(s.SafehouseId, out var active);
                return active >= s.CapacityGirls!.Value * 0.9;
            });

        // ── 5. Social Media Top Performer (Pipeline 03 proxy) ─────────────────
        // Most effective platform by donation referrals in the last 30 days.
        var thirtyDaysAgo = now.AddDays(-30);
        var topPlatform = await _context.SocialMediaPosts
            .AsNoTracking()
            .Where(p => p.CreatedAt >= thirtyDaysAgo)
            .GroupBy(p => p.Platform)
            .Select(g => new
            {
                Platform = g.Key,
                DonationReferrals = g.Sum(p => p.DonationReferrals),
                AvgEngagement = g.Average(p => (double?)p.EngagementRate) ?? 0.0
            })
            .OrderByDescending(g => g.DonationReferrals)
            .FirstOrDefaultAsync();

        return Ok(new
        {
            atRiskDonorCount,
            upgradeOpportunityCount,
            residentsReadyCount,
            safehousesNearCapacity,
            topSocialPlatform = topPlatform?.Platform ?? null,
            topSocialReferrals = topPlatform?.DonationReferrals ?? 0
        });
    }
}
