using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Intex2026.Api.Data;

namespace Intex2026.Api.Controllers;

/// <summary>
/// ML-derived insight endpoints for the admin ML Insights page and dashboard.
/// All metrics are computed from live Azure SQL data using rules derived
/// from the Python ML pipelines (ml-pipelines/ in the repo root).
/// </summary>
[ApiController]
[Route("api/mlinsights")]
[Authorize(Roles = "Admin,Staff")]
public class MLInsightsController : ControllerBase
{
    private readonly AppDbContext _context;

    private static readonly string[] DonorTypes = { "MonetaryDonor", "InKindDonor" };

    public MLInsightsController(AppDbContext context)
    {
        _context = context;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // GET /api/mlinsights  — dashboard summary (4 headline KPIs + social top)
    // ──────────────────────────────────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetInsights()
    {
        var now = DateTime.UtcNow;
        var ninetyDaysAgo = now.AddDays(-90);

        // 1. At-Risk Donors
        var latestMonetaryGift = await _context.Donations
            .AsNoTracking()
            .Where(d => d.DonationType == "Monetary" && d.DonationDate.HasValue)
            .GroupBy(d => d.SupporterId)
            .Select(g => new { SupporterId = g.Key, LastGift = g.Max(d => d.DonationDate) })
            .ToListAsync();

        var donorSupporterIds = await _context.Supporters
            .AsNoTracking()
            .Where(s => DonorTypes.Contains(s.SupporterType))
            .Select(s => s.SupporterId)
            .ToHashSetAsync();

        int atRiskDonorCount = latestMonetaryGift
            .Count(d => donorSupporterIds.Contains(d.SupporterId) && d.LastGift < ninetyDaysAgo);

        // 2. Upgrade Opportunities
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

        // 3. Residents Ready
        int residentsReadyCount = await _context.Residents
            .AsNoTracking()
            .Where(r => r.CaseStatus == "Active"
                        && r.CurrentRiskLevel != null
                        && r.CurrentRiskLevel.ToLower() == "low")
            .CountAsync();

        // 4. Safehouses Near Capacity
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

        // 5. Top Social Platform (last 30 days)
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

    // ──────────────────────────────────────────────────────────────────────────
    // GET /api/mlinsights/donor-churn   — Pipeline 01 detail
    // ──────────────────────────────────────────────────────────────────────────
    [HttpGet("donor-churn")]
    public async Task<IActionResult> GetDonorChurn()
    {
        var now = DateTime.UtcNow;
        var twelveMonthsAgo = now.AddMonths(-12);
        var twentyFourMonthsAgo = now.AddMonths(-24);

        // Get all monetary donors with their last gift date
        var donorLastGift = await (
            from d in _context.Donations.AsNoTracking()
            where d.DonationType == "Monetary" && d.DonationDate.HasValue
            group d by d.SupporterId into g
            select new { SupporterId = g.Key, LastGift = g.Max(x => x.DonationDate) }
        ).ToListAsync();

        var donorIds = await _context.Supporters.AsNoTracking()
            .Where(s => DonorTypes.Contains(s.SupporterType))
            .Select(s => s.SupporterId).ToHashSetAsync();

        // Recency buckets (days since last gift)
        var buckets = new[]
        {
            new { Label = "< 30 days",   Min = 0,   Max = 30  },
            new { Label = "30–60 days",  Min = 30,  Max = 60  },
            new { Label = "60–90 days",  Min = 60,  Max = 90  },
            new { Label = "90–180 days", Min = 90,  Max = 180 },
            new { Label = "180+ days",   Min = 180, Max = int.MaxValue }
        };

        var recencyBuckets = buckets.Select(b => new
        {
            label = b.Label,
            count = donorLastGift
                .Where(d => donorIds.Contains(d.SupporterId))
                .Count(d =>
                {
                    var days = (int)(now - d.LastGift!.Value).TotalDays;
                    return days >= b.Min && days < b.Max;
                })
        }).ToList();

        // Rolling 12-month retention
        var priorDonors = await _context.Donations.AsNoTracking()
            .Where(d => d.DonationDate >= twentyFourMonthsAgo && d.DonationDate < twelveMonthsAgo)
            .Select(d => d.SupporterId).Distinct().ToListAsync();
        var recentDonors = await _context.Donations.AsNoTracking()
            .Where(d => d.DonationDate >= twelveMonthsAgo)
            .Select(d => d.SupporterId).Distinct().ToListAsync();
        double retentionRate = priorDonors.Count == 0 ? 0
            : (double)priorDonors.Intersect(recentDonors).Count() / priorDonors.Count;

        // Top 10 at-risk donors (90+ days, ordered by lifetime donated desc)
        var ninetyDaysAgo = now.AddDays(-90);
        var atRiskIds = donorLastGift
            .Where(d => donorIds.Contains(d.SupporterId) && d.LastGift < ninetyDaysAgo)
            .Select(d => d.SupporterId).ToHashSet();

        var lifetimeTotals = await _context.Donations.AsNoTracking()
            .Where(d => d.DonationType == "Monetary" && atRiskIds.Contains(d.SupporterId))
            .GroupBy(d => d.SupporterId)
            .Select(g => new { SupporterId = g.Key, Total = g.Sum(x => x.Amount ?? 0m) })
            .ToListAsync();

        var atRiskSupporters = await _context.Supporters.AsNoTracking()
            .Where(s => atRiskIds.Contains(s.SupporterId))
            .Select(s => new { s.SupporterId, s.DisplayName, s.Email, s.AcquisitionChannel })
            .ToListAsync();

        var topAtRisk = (
            from s in atRiskSupporters
            join lg in donorLastGift on s.SupporterId equals lg.SupporterId
            join lt in lifetimeTotals on s.SupporterId equals lt.SupporterId into ltj
            from lt in ltj.DefaultIfEmpty()
            select new
            {
                supporterId = s.SupporterId,
                name = s.DisplayName,
                email = s.Email,
                channel = s.AcquisitionChannel,
                daysSinceLastGift = (int)(now - lg.LastGift!.Value).TotalDays,
                lifetimeDonated = lt?.Total ?? 0m
            }
        ).OrderByDescending(x => x.lifetimeDonated).Take(10).ToList();

        return Ok(new
        {
            retentionRate,
            atRiskCount = recencyBuckets.Where(b => b.label is "90–180 days" or "180+ days").Sum(b => b.count),
            lapsedCount = recencyBuckets.First(b => b.label == "180+ days").count,
            recencyBuckets,
            topAtRiskDonors = topAtRisk
        });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // GET /api/mlinsights/donation-capacity   — Pipeline 02 detail
    // ──────────────────────────────────────────────────────────────────────────
    [HttpGet("donation-capacity")]
    public async Task<IActionResult> GetDonationCapacity()
    {
        // Per-donor giving stats for monetary donors
        var donorStats = await (
            from d in _context.Donations.AsNoTracking()
            where d.DonationType == "Monetary" && d.Amount.HasValue
            group d by d.SupporterId into g
            select new
            {
                SupporterId = g.Key,
                AvgDonation = g.Average(x => x.Amount),
                MaxDonation = g.Max(x => x.Amount),
                TotalDonated = g.Sum(x => x.Amount),
                DonationCount = g.Count(),
                HasRecurring = g.Any(x => x.IsRecurring == true)
            }
        ).ToListAsync();

        var donorIds = await _context.Supporters.AsNoTracking()
            .Where(s => DonorTypes.Contains(s.SupporterType))
            .Select(s => s.SupporterId).ToHashSetAsync();

        // Capacity tier classification (based on avg donation amount)
        string GetTier(decimal? avg) => avg switch
        {
            >= 50000m => "Major",
            >= 20000m => "Mid-Level",
            >= 5000m  => "Annual",
            _         => "Starter"
        };

        var tierGroups = donorStats
            .Where(d => donorIds.Contains(d.SupporterId))
            .GroupBy(d => GetTier(d.AvgDonation))
            .Select(g => new
            {
                tier = g.Key,
                count = g.Count(),
                totalDonated = g.Sum(d => d.TotalDonated ?? 0m)
            })
            .OrderByDescending(g => g.totalDonated)
            .ToList();

        // Upgrade opportunities: recurring donors where max > 1.5× avg
        var supporterNames = await _context.Supporters.AsNoTracking()
            .Where(s => donorIds.Contains(s.SupporterId))
            .Select(s => new { s.SupporterId, s.DisplayName, s.AcquisitionChannel })
            .ToDictionaryAsync(s => s.SupporterId);

        var upgradeOpps = donorStats
            .Where(d => donorIds.Contains(d.SupporterId)
                        && d.DonationCount >= 2
                        && d.HasRecurring
                        && d.MaxDonation.HasValue && d.AvgDonation.HasValue
                        && d.MaxDonation > d.AvgDonation * 1.5m)
            .OrderByDescending(d => d.MaxDonation)
            .Take(10)
            .Select(d => new
            {
                supporterId = d.SupporterId,
                name = supporterNames.TryGetValue(d.SupporterId, out var s) ? s.DisplayName : "—",
                channel = supporterNames.TryGetValue(d.SupporterId, out var sc) ? sc.AcquisitionChannel : null,
                avgDonation = d.AvgDonation ?? 0m,
                maxDonation = d.MaxDonation ?? 0m,
                headroom = (d.MaxDonation ?? 0m) - (d.AvgDonation ?? 0m),
                currentTier = GetTier(d.AvgDonation)
            })
            .ToList();

        // Channel avg donation — from supporters + donations joined
        var channelStats = await (
            from d in _context.Donations.AsNoTracking()
            where d.DonationType == "Monetary" && d.Amount.HasValue
            join s in _context.Supporters.AsNoTracking() on d.SupporterId equals s.SupporterId
            where s.AcquisitionChannel != null
            group new { d, s } by s.AcquisitionChannel into g
            select new
            {
                channel = g.Key,
                avgDonation = g.Average(x => x.d.Amount),
                donorCount = g.Select(x => x.s.SupporterId).Distinct().Count()
            }
        ).OrderByDescending(g => g.avgDonation).ToListAsync();

        return Ok(new
        {
            tierBreakdown = tierGroups,
            upgradeOpportunities = upgradeOpps,
            channelAvgDonation = channelStats,
            totalUpgradeOpportunities = upgradeOpps.Count
        });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // GET /api/mlinsights/resident-outcomes   — Pipeline 04 detail
    // ──────────────────────────────────────────────────────────────────────────
    [HttpGet("resident-outcomes")]
    public async Task<IActionResult> GetResidentOutcomes()
    {
        var now = DateTime.UtcNow;

        var residents = await _context.Residents.AsNoTracking().ToListAsync();

        // Current risk level distribution
        var riskBreakdown = residents
            .GroupBy(r => r.CurrentRiskLevel ?? "Unknown")
            .Select(g => new { level = g.Key, count = g.Count() })
            .OrderByDescending(g => g.count)
            .ToList();

        // Reintegration status distribution
        var reintegrationBreakdown = residents
            .GroupBy(r => r.ReintegrationStatus ?? "Not Set")
            .Select(g => new { status = g.Key, count = g.Count() })
            .OrderByDescending(g => g.count)
            .ToList();

        // Case status breakdown
        var caseStatusBreakdown = residents
            .GroupBy(r => r.CaseStatus ?? "Unknown")
            .Select(g => new { status = g.Key, count = g.Count() })
            .ToList();

        // ML readiness proxy: map risk level + reintegration status → readiness tier
        string GetReadiness(string? risk, string? reint) =>
            reint?.ToLower() is "completed" ? "Completed" :
            risk?.ToLower() is "low" ? "Ready" :
            risk?.ToLower() is "medium" ? "Approaching" :
            risk?.ToLower() is "high" ? "In Progress" :
            "At Risk";

        var readinessTiers = residents
            .Where(r => r.CaseStatus == "Active")
            .GroupBy(r => GetReadiness(r.CurrentRiskLevel, r.ReintegrationStatus))
            .Select(g => new { tier = g.Key, count = g.Count() })
            .ToList();

        // Top at-risk residents (active, critical/high risk)
        var atRiskResidents = residents
            .Where(r => r.CaseStatus == "Active"
                        && r.CurrentRiskLevel?.ToLower() is "critical" or "high")
            .Select(r => new
            {
                residentId = r.ResidentId,
                internalCode = r.InternalCode,
                caseCategory = r.CaseCategory,
                currentRiskLevel = r.CurrentRiskLevel,
                initialRiskLevel = r.InitialRiskLevel,
                reintegrationStatus = r.ReintegrationStatus,
                daysInProgram = r.DateOfAdmission.HasValue
                    ? (int)(now - r.DateOfAdmission.Value).TotalDays
                    : 0,
                assignedSocialWorker = r.AssignedSocialWorker
            })
            .OrderByDescending(r => r.currentRiskLevel == "Critical" ? 1 : 0)
            .Take(10)
            .ToList();

        int activeCount = residents.Count(r => r.CaseStatus == "Active");
        double avgDaysInProgram = residents
            .Where(r => r.CaseStatus == "Active" && r.DateOfAdmission.HasValue)
            .Select(r => (now - r.DateOfAdmission!.Value).TotalDays)
            .DefaultIfEmpty(0).Average();

        int completedCount = residents.Count(r =>
            r.ReintegrationStatus?.ToLower() is "completed");

        return Ok(new
        {
            activeCount,
            completedReintegrationCount = completedCount,
            avgDaysInProgram = (int)avgDaysInProgram,
            riskBreakdown,
            readinessTiers,
            reintegrationBreakdown,
            caseStatusBreakdown,
            atRiskResidents
        });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // GET /api/mlinsights/geographic   — Pipeline 05 detail
    // ──────────────────────────────────────────────────────────────────────────
    [HttpGet("geographic")]
    public async Task<IActionResult> GetGeographic()
    {
        var safehouses = await _context.Safehouses.AsNoTracking().ToListAsync();

        var residentCounts = await _context.Residents.AsNoTracking()
            .Where(r => r.CaseStatus == "Active")
            .GroupBy(r => r.SafehouseId)
            .Select(g => new { SafehouseId = g.Key, ActiveCount = g.Count() })
            .ToDictionaryAsync(x => x.SafehouseId, x => x.ActiveCount);

        var safehouseDetails = safehouses
            .Where(s => s.Status?.ToLower() != "closed")
            .Select(s =>
            {
                residentCounts.TryGetValue(s.SafehouseId, out var active);
                var cap = s.CapacityGirls ?? 1;
                var util = (double)active / cap;
                return new
                {
                    id = s.SafehouseId,
                    name = s.Name,
                    region = s.Region ?? "Unknown",
                    city = s.City ?? "—",
                    activeResidents = active,
                    capacity = s.CapacityGirls ?? 0,
                    utilization = Math.Round(util, 3),
                    status = util >= 0.9 ? "Near Capacity" : util < 0.5 ? "Under-utilized" : "Healthy",
                    efficiencyScore = Math.Round(
                        Math.Min(util / 0.8, 1) * 40 +    // 40 pts for occupancy near 80%
                        (1 - Math.Min(Math.Max(util - 0.9, 0) / 0.1, 1)) * 30 + // 30 pts for not overcrowded
                        30.0,                               // base 30
                        1)
                };
            })
            .OrderByDescending(s => s.efficiencyScore)
            .ToList();

        // Regional roll-up
        var regionalBreakdown = safehouseDetails
            .GroupBy(s => s.region)
            .Select(g => new
            {
                region = g.Key,
                safehouses = g.Count(),
                capacity = g.Sum(s => s.capacity),
                activeResidents = g.Sum(s => s.activeResidents),
                utilization = g.Sum(s => s.capacity) > 0
                    ? Math.Round((double)g.Sum(s => s.activeResidents) / g.Sum(s => s.capacity), 3)
                    : 0.0
            })
            .OrderByDescending(g => g.activeResidents)
            .ToList();

        int totalCapacity = safehouses.Sum(s => s.CapacityGirls ?? 0);
        int totalActive = residentCounts.Values.Sum();

        return Ok(new
        {
            totalCapacity,
            totalActive,
            overallUtilization = totalCapacity > 0 ? Math.Round((double)totalActive / totalCapacity, 3) : 0.0,
            nearCapacityCount = safehouseDetails.Count(s => s.status == "Near Capacity"),
            underUtilizedCount = safehouseDetails.Count(s => s.status == "Under-utilized"),
            safehouseDetails,
            regionalBreakdown
        });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // GET /api/mlinsights/acquisition-roi   — Pipeline 06 detail
    // ──────────────────────────────────────────────────────────────────────────
    [HttpGet("acquisition-roi")]
    public async Task<IActionResult> GetAcquisitionRoi()
    {
        var now = DateTime.UtcNow;
        var twelveMonthsAgo = now.AddMonths(-12);
        var twentyFourMonthsAgo = now.AddMonths(-24);

        // Channel-level donor stats
        var channelStats = await (
            from s in _context.Supporters.AsNoTracking()
            where DonorTypes.Contains(s.SupporterType) && s.AcquisitionChannel != null
            join d in _context.Donations.AsNoTracking()
                on s.SupporterId equals d.SupporterId into dj
            from d in dj.DefaultIfEmpty()
            where d == null || d.DonationType == "Monetary"
            group new { s, d } by s.AcquisitionChannel into g
            select new
            {
                channel = g.Key,
                donorCount = g.Select(x => x.s.SupporterId).Distinct().Count(),
                totalDonated = g.Sum(x => x.d != null ? x.d.Amount ?? 0m : 0m),
                avgDonation = g.Where(x => x.d != null && x.d.Amount.HasValue)
                               .Average(x => (decimal?)x.d.Amount) ?? 0m
            }
        ).OrderByDescending(g => g.avgDonation).ToListAsync();

        // Retention rate per channel
        var priorDonorsByChannel = await (
            from d in _context.Donations.AsNoTracking()
            where d.DonationDate >= twentyFourMonthsAgo && d.DonationDate < twelveMonthsAgo
            join s in _context.Supporters.AsNoTracking() on d.SupporterId equals s.SupporterId
            where s.AcquisitionChannel != null
            group s.SupporterId by s.AcquisitionChannel into g
            select new { Channel = g.Key, SupporterIds = g.Distinct().ToList() }
        ).ToListAsync();

        var recentDonorsByChannel = await (
            from d in _context.Donations.AsNoTracking()
            where d.DonationDate >= twelveMonthsAgo
            join s in _context.Supporters.AsNoTracking() on d.SupporterId equals s.SupporterId
            where s.AcquisitionChannel != null
            group s.SupporterId by s.AcquisitionChannel into g
            select new { Channel = g.Key, SupporterIds = g.Distinct().ToList() }
        ).ToListAsync();

        var recentByChannel = recentDonorsByChannel.ToDictionary(x => x.Channel, x => x.SupporterIds.ToHashSet());

        var channelRetention = priorDonorsByChannel.Select(p => new
        {
            channel = p.Channel,
            retentionRate = p.SupporterIds.Count == 0 ? 0.0
                : recentByChannel.TryGetValue(p.Channel, out var rids)
                    ? (double)p.SupporterIds.Count(id => rids.Contains(id)) / p.SupporterIds.Count
                    : 0.0
        }).ToDictionary(x => x.channel, x => x.retentionRate);

        // Recurring rate per channel
        var recurringByChannel = await (
            from s in _context.Supporters.AsNoTracking()
            where DonorTypes.Contains(s.SupporterType) && s.AcquisitionChannel != null
            join d in _context.Donations.AsNoTracking() on s.SupporterId equals d.SupporterId
            where d.IsRecurring == true
            group s.SupporterId by s.AcquisitionChannel into g
            select new { Channel = g.Key, Count = g.Distinct().Count() }
        ).ToDictionaryAsync(x => x.Channel, x => x.Count);

        var enrichedChannelStats = channelStats.Select(c =>
        {
            recurringByChannel.TryGetValue(c.channel!, out var recCount);
            return new
            {
                c.channel,
                c.donorCount,
                c.totalDonated,
                c.avgDonation,
                retentionRate = channelRetention.TryGetValue(c.channel!, out var ret) ? Math.Round(ret, 3) : 0.0,
                recurringDonors = recCount,
                recurringRate = c.donorCount > 0 ? Math.Round((double)recCount / c.donorCount, 3) : 0.0,
                // ROI score: LTV 50% + Retention 30% + Recurring 20% (raw values, normalized in frontend)
                rawLtvScore = (double)(c.avgDonation)
            };
        }).ToList();

        return Ok(new
        {
            channels = enrichedChannelStats,
            topChannelByLtv = enrichedChannelStats.OrderByDescending(c => c.avgDonation).FirstOrDefault()?.channel,
            topChannelByRetention = enrichedChannelStats.OrderByDescending(c => c.retentionRate).FirstOrDefault()?.channel
        });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // GET /api/mlinsights/partner-effectiveness — Pipeline 07
    // ──────────────────────────────────────────────────────────────────────────
    [HttpGet("partner-effectiveness")]
    public async Task<IActionResult> GetPartnerEffectiveness()
    {
        var activePartners = await _context.Partners
            .AsNoTracking()
            .Where(p => p.Status == "Active")
            .ToListAsync();

        var activeAssignments = await _context.PartnerAssignments
            .AsNoTracking()
            .Where(a => a.Status == "Active")
            .ToListAsync();

        var safehouses = await _context.Safehouses
            .AsNoTracking()
            .Select(s => new { s.SafehouseId, SafehouseName = s.Name })
            .ToListAsync();

        // Partners by role type
        var byRoleType = activePartners
            .GroupBy(p => p.RoleType)
            .Select(g => new { role = g.Key, count = g.Count() })
            .OrderByDescending(x => x.count)
            .ToList();

        // Partners by org type
        var byType = activePartners
            .GroupBy(p => p.PartnerType)
            .Select(g => new { type = g.Key, count = g.Count() })
            .ToList();

        // Assignments by program area
        var byProgramArea = activeAssignments
            .GroupBy(a => a.ProgramArea)
            .Select(g => new { area = g.Key, count = g.Count() })
            .OrderByDescending(x => x.count)
            .ToList();

        // Partners by region
        var byRegion = activePartners
            .GroupBy(p => p.Region)
            .Select(g => new { region = g.Key, count = g.Count() })
            .OrderByDescending(x => x.count)
            .ToList();

        // Per-safehouse coverage
        var allAreas = new[] { "Education", "Wellbeing", "Operations", "Logistics" };
        var coveragePerSafehouse = safehouses.Select(sh =>
        {
            var areasCovered = activeAssignments
                .Where(a => a.SafehouseId == sh.SafehouseId)
                .Select(a => a.ProgramArea)
                .Distinct()
                .ToHashSet();
            var partnerCount = activeAssignments.Count(a => a.SafehouseId == sh.SafehouseId);
            return new
            {
                safehouseName = sh.SafehouseName,
                partnerCount,
                areasCovered = areasCovered.Count,
                hasEducation = areasCovered.Contains("Education"),
                hasWellbeing = areasCovered.Contains("Wellbeing"),
                hasOperations = areasCovered.Contains("Operations"),
                hasLogistics = areasCovered.Contains("Logistics"),
                missingAreas = allAreas.Where(a => !areasCovered.Contains(a)).ToList()
            };
        }).OrderByDescending(x => x.areasCovered).ToList();

        int safehousesWithFullCoverage = coveragePerSafehouse.Count(s => s.areasCovered >= 3);
        double avgPartnersPerSafehouse = coveragePerSafehouse.Any()
            ? Math.Round(coveragePerSafehouse.Average(s => s.partnerCount), 1) : 0;
        double avgAreasPerSafehouse = coveragePerSafehouse.Any()
            ? Math.Round(coveragePerSafehouse.Average(s => s.areasCovered), 1) : 0;

        return Ok(new
        {
            totalActivePartners = activePartners.Count,
            totalActiveAssignments = activeAssignments.Count,
            avgPartnersPerSafehouse,
            avgAreasPerSafehouse,
            safehousesWithFullCoverage,
            topRoleType = byRoleType.FirstOrDefault()?.role,
            byRoleType,
            byType,
            byProgramArea,
            byRegion,
            coveragePerSafehouse
        });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // GET /api/mlinsights/inkind-needs — Pipeline 08
    // ──────────────────────────────────────────────────────────────────────────
    [HttpGet("inkind-needs")]
    public async Task<IActionResult> GetInKindNeeds()
    {
        var items = await _context.InKindDonationItems
            .AsNoTracking()
            .Join(_context.Donations.AsNoTracking(),
                  i => i.DonationId,
                  d => d.DonationId,
                  (i, d) => new
                  {
                      i.ItemCategory,
                      i.Quantity,
                      i.EstimatedUnitValue,
                      i.ReceivedCondition,
                      i.IntendedUse,
                      d.DonationDate
                  })
            .ToListAsync();

        // By category — quantity and estimated value
        var byCategory = items
            .GroupBy(i => i.ItemCategory)
            .Select(g => new
            {
                category = g.Key,
                quantity = g.Sum(i => i.Quantity),
                estimatedValue = Math.Round((double)g.Sum(i => i.EstimatedUnitValue * i.Quantity), 0)
            })
            .OrderByDescending(x => x.quantity)
            .ToList();

        // By condition
        var byCondition = items
            .GroupBy(i => i.ReceivedCondition)
            .Select(g => new { condition = g.Key, count = g.Count() })
            .OrderByDescending(x => x.count)
            .ToList();

        // By intended use
        var byIntendedUse = items
            .Where(i => i.IntendedUse != null)
            .GroupBy(i => i.IntendedUse!)
            .Select(g => new { use = g.Key, quantity = g.Sum(i => i.Quantity) })
            .OrderByDescending(x => x.quantity)
            .ToList();

        // Monthly trend — last 12 months
        var cutoff = DateTime.UtcNow.AddMonths(-12);
        var byMonth = items
            .Where(i => i.DonationDate.HasValue && i.DonationDate.Value >= cutoff)
            .GroupBy(i => i.DonationDate!.Value.ToString("yyyy-MM"))
            .Select(g => new { month = g.Key, quantity = g.Sum(i => i.Quantity) })
            .OrderBy(x => x.month)
            .ToList();

        int totalQuantity = items.Sum(i => i.Quantity);
        decimal totalEstimatedValue = items.Sum(i => i.EstimatedUnitValue * i.Quantity);
        string topCategory = byCategory.FirstOrDefault()?.category ?? "—";
        int goodOrBetterCount = items.Count(i => i.ReceivedCondition == "New" || i.ReceivedCondition == "Good");
        double conditionRate = items.Any() ? Math.Round((double)goodOrBetterCount / items.Count, 3) : 0;

        return Ok(new
        {
            totalQuantity,
            totalEstimatedValue = Math.Round(totalEstimatedValue, 0),
            topCategory,
            conditionRate,
            byCategory,
            byCondition,
            byIntendedUse,
            byMonth
        });
    }
}
