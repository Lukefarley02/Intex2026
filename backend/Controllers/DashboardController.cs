using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Intex2026.Api.Data;

namespace Intex2026.Api.Controllers;

/// <summary>
/// Admin/Staff dashboard aggregates. Everything is computed live against
/// the Azure SQL database — no cached values. Endpoints are read-only.
/// </summary>
[ApiController]
[Route("api/dashboard")]
[Authorize(Roles = "Admin,Staff")]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _context;

    // Supporter types that count as "donors" for KPI purposes. Matches the
    // donor filter on SupportersController and the choices listed in the
    // case doc's Appendix A.
    private static readonly string[] DonorTypes = { "MonetaryDonor", "InKindDonor" };

    public DashboardController(AppDbContext context)
    {
        _context = context;
    }

    // GET /api/dashboard/stats
    // Returns the KPIs shown on the admin/staff landing dashboard.
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var now = DateTime.UtcNow;
        var startOfYear = new DateTime(now.Year, 1, 1);
        var startOfMonth = new DateTime(now.Year, now.Month, 1);
        var startOfLastYear = new DateTime(now.Year - 1, 1, 1);
        var sameDayLastYear = startOfLastYear.AddDays((now - startOfYear).Days);
        var startOfPrevMonth = startOfMonth.AddMonths(-1);
        var twelveMonthsAgo = now.AddMonths(-12);
        var twentyFourMonthsAgo = now.AddMonths(-24);

        // Only MonetaryDonor + InKindDonor supporters count as "donors" per
        // Appendix A. Status filter falls back to total donor count if the
        // status column isn't populated.
        var donorBase = _context.Supporters
            .AsNoTracking()
            .Where(s => DonorTypes.Contains(s.SupporterType));

        var totalDonors = await donorBase.CountAsync();
        var activeDonors = await donorBase
            .Where(s => s.Status != null && s.Status.ToLower() == "active")
            .CountAsync();
        if (activeDonors == 0) activeDonors = totalDonors;

        // Donors added this month (based on first_donation_date or created_at)
        var donorsThisMonth = await donorBase
            .Where(s =>
                (s.FirstDonationDate != null && s.FirstDonationDate >= startOfMonth) ||
                (s.CreatedAt != null && s.CreatedAt >= startOfMonth))
            .CountAsync();

        // Donation sums — use amount when present, otherwise estimated_value
        var donationsYtd = await _context.Donations
            .AsNoTracking()
            .Where(d => d.DonationDate != null && d.DonationDate >= startOfYear)
            .SumAsync(d => (decimal?)(d.Amount ?? d.EstimatedValue ?? 0m)) ?? 0m;

        var donationsLastYearSamePeriod = await _context.Donations
            .AsNoTracking()
            .Where(d => d.DonationDate != null
                        && d.DonationDate >= startOfLastYear
                        && d.DonationDate <= sameDayLastYear)
            .SumAsync(d => (decimal?)(d.Amount ?? d.EstimatedValue ?? 0m)) ?? 0m;

        var donationsThisMonth = await _context.Donations
            .AsNoTracking()
            .Where(d => d.DonationDate != null && d.DonationDate >= startOfMonth)
            .SumAsync(d => (decimal?)(d.Amount ?? d.EstimatedValue ?? 0m)) ?? 0m;

        var donationsPrevMonth = await _context.Donations
            .AsNoTracking()
            .Where(d => d.DonationDate != null
                        && d.DonationDate >= startOfPrevMonth
                        && d.DonationDate < startOfMonth)
            .SumAsync(d => (decimal?)(d.Amount ?? d.EstimatedValue ?? 0m)) ?? 0m;

        // Donor retention — % of donors who gave in the prior 12 months and
        // also gave in the most recent 12 months.
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

        double donorRetention = priorDonors.Count == 0
            ? 0
            : (double)priorDonors.Intersect(recentDonors).Count() / priorDonors.Count;

        // Recent activity feed — most recent donations, joined to supporter name
        var recentActivity = await (
            from d in _context.Donations.AsNoTracking()
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
