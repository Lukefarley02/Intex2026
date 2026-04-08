using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Intex2026.Api.Authorization;
using Intex2026.Api.Data;

namespace Intex2026.Api.Controllers;

/// <summary>
/// Admin/Staff dashboard aggregates. Everything is computed live against
/// the Azure SQL database — no cached values. Endpoints are read-only.
///
/// All numbers are scoped to what the caller is allowed to see:
///   Founder         → company-wide
///   Regional Mgr    → supporters in their region
///   Location Mgr    → supporters in their region (no city column on supporters)
///   Staff           → only the four non-monetary supporter types in their region;
///                     monetary KPIs are returned as zero so the page still renders
/// </summary>
[ApiController]
[Route("api/dashboard")]
[Authorize(Roles = "Admin,Staff")]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly UserManager<ApplicationUser> _users;

    // Supporter types that count as "donors" for KPI purposes.
    private static readonly string[] DonorTypes = { "MonetaryDonor", "InKindDonor" };

    public DashboardController(AppDbContext context, UserManager<ApplicationUser> users)
    {
        _context = context;
        _users = users;
    }

    // GET /api/dashboard/stats
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var scope = await UserScope.FromPrincipalAsync(User, _users);
        var now = DateTime.UtcNow;
        var startOfYear = new DateTime(now.Year, 1, 1);
        var startOfMonth = new DateTime(now.Year, now.Month, 1);
        var startOfLastYear = new DateTime(now.Year - 1, 1, 1);
        var sameDayLastYear = startOfLastYear.AddDays((now - startOfYear).Days);
        var startOfPrevMonth = startOfMonth.AddMonths(-1);
        var twelveMonthsAgo = now.AddMonths(-12);
        var twentyFourMonthsAgo = now.AddMonths(-24);

        // Staff don't see monetary donors at all — return zeros for the
        // money KPIs so the dashboard still renders without leaking data.
        if (scope.IsStaff)
        {
            return Ok(new
            {
                activeDonors = 0,
                donorsThisMonth = 0,
                donationsYtd = 0m,
                donationsYtdChangePct = (double?)null,
                donationsThisMonth = 0m,
                donationsMonthChangePct = (double?)null,
                donorRetention = 0d,
                recentActivity = Array.Empty<object>()
            });
        }

        // Donor base, scoped to the caller's region (founders see all).
        var donorBase = scope
            .ApplyToSupporters(_context.Supporters.AsNoTracking())
            .Where(s => DonorTypes.Contains(s.SupporterType));

        var totalDonors = await donorBase.CountAsync();
        var activeDonors = await donorBase
            .Where(s => s.Status != null && s.Status.ToLower() == "active")
            .CountAsync();
        if (activeDonors == 0) activeDonors = totalDonors;

        var donorsThisMonth = await donorBase
            .Where(s =>
                (s.FirstDonationDate != null && s.FirstDonationDate >= startOfMonth) ||
                (s.CreatedAt != null && s.CreatedAt >= startOfMonth))
            .CountAsync();

        // Donations are scoped by joining to the in-scope supporter set.
        var inScopeSupporterIds = donorBase.Select(s => s.SupporterId);
        var scopedDonations = _context.Donations.AsNoTracking()
            .Where(d => inScopeSupporterIds.Contains(d.SupporterId));

        var donationsYtd = await scopedDonations
            .Where(d => d.DonationDate != null && d.DonationDate >= startOfYear)
            .SumAsync(d => (decimal?)(d.Amount ?? d.EstimatedValue ?? 0m)) ?? 0m;

        var donationsLastYearSamePeriod = await scopedDonations
            .Where(d => d.DonationDate != null
                        && d.DonationDate >= startOfLastYear
                        && d.DonationDate <= sameDayLastYear)
            .SumAsync(d => (decimal?)(d.Amount ?? d.EstimatedValue ?? 0m)) ?? 0m;

        var donationsThisMonth = await scopedDonations
            .Where(d => d.DonationDate != null && d.DonationDate >= startOfMonth)
            .SumAsync(d => (decimal?)(d.Amount ?? d.EstimatedValue ?? 0m)) ?? 0m;

        var donationsPrevMonth = await scopedDonations
            .Where(d => d.DonationDate != null
                        && d.DonationDate >= startOfPrevMonth
                        && d.DonationDate < startOfMonth)
            .SumAsync(d => (decimal?)(d.Amount ?? d.EstimatedValue ?? 0m)) ?? 0m;

        var priorDonors = await scopedDonations
            .Where(d => d.DonationDate != null
                        && d.DonationDate >= twentyFourMonthsAgo
                        && d.DonationDate < twelveMonthsAgo)
            .Select(d => d.SupporterId)
            .Distinct()
            .ToListAsync();

        var recentDonors = await scopedDonations
            .Where(d => d.DonationDate != null && d.DonationDate >= twelveMonthsAgo)
            .Select(d => d.SupporterId)
            .Distinct()
            .ToListAsync();

        double donorRetention = priorDonors.Count == 0
            ? 0
            : (double)priorDonors.Intersect(recentDonors).Count() / priorDonors.Count;

        // Recent activity feed — most recent in-scope donations
        var recentActivity = await (
            from d in scopedDonations
            join s in _context.Supporters.AsNoTracking() on d.SupporterId equals s.SupporterId
            where d.DonationDate != null
            orderby d.DonationDate descending
            select new
            {
                supporterName = s.DisplayName != null && s.DisplayName != ""
                    ? s.DisplayName
                    : (s.FirstName + " " + s.LastName).Trim(),
                amount = d.Amount ?? d.EstimatedValue ?? 0m,
                date = d.DonationDate,
                campaign = d.CampaignName
            }
        ).Take(6).ToListAsync();

        return Ok(new
        {
            activeDonors,
            donorsThisMonth,
            donationsYtd,
            donationsYtdChangePct = donationsLastYearSamePeriod == 0
                ? (double?)null
                : (double)((donationsYtd - donationsLastYearSamePeriod) / donationsLastYearSamePeriod),
            donationsThisMonth,
            donationsMonthChangePct = donationsPrevMonth == 0
                ? (double?)null
                : (double)((donationsThisMonth - donationsPrevMonth) / donationsPrevMonth),
            donorRetention,
            recentActivity
        });
    }
}
