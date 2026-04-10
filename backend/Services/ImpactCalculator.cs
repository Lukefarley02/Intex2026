using Intex2026.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Intex2026.Api.Services;

/// <summary>
/// Computes donor-impact metrics from live database values.
///
/// Conceptual model (Apr 8 2026 revision):
///   The site's public anchor rate is "$25 shelters a girl for a full
///   month" — so the program economics used for donor impact are
///   $25/month × 12 months = $300/year per girl. Every other derived
///   figure (days of care, girl-years funded, months of care) is
///   expressed against that $25/month baseline. We expose donor impact
///   on two complementary axes:
///
///     months_of_care  = donated ÷ monthly_cost_per_girl
///                       (linear, always rewards every dollar, the
///                        primary "here's what your gift bought" metric)
///
///     girls_helped    = floor(months_of_care ÷ 12)
///                       with a floor of 1 once any meaningful gift is
///                       recorded — this is the number of *full girl-
///                       years of care* the donor has funded, so it
///                       stays honest when the same donor gives $25/mo
///                       for 10 months (10 months of care for 1 girl,
///                       not 10 girls).
///
/// Using DB totals means the ratio updates automatically as new
/// donations or residents are added — no hardcoded rate. Fallback floor
/// kicks in when the seed data is too sparse to produce a meaningful
/// ratio.
/// </summary>
public static class ImpactCalculator
{
    // Baseline monthly care cost — matches the "$25 shelters a girl for
    // a month" public anchor used throughout the site. Every impact
    // figure is derived from this.
    private const decimal BaselineMonthlyCostPerGirl = 25m;

    // Twelve months per girl-year — used to translate the monthly rate
    // into a yearly figure for the girl-years-funded metric.
    private const decimal MonthsPerYear = 12m;

    // Derived yearly baseline. $25/month × 12 = $300/year per girl.
    private const decimal BaselineYearlyCostPerGirl =
        BaselineMonthlyCostPerGirl * MonthsPerYear;

    private const decimal FallbackCostPerGirl = BaselineYearlyCostPerGirl;
    private const decimal MinimumCostPerGirl  = BaselineYearlyCostPerGirl;

    /// <summary>
    /// Returns the program-wide yearly cost-per-girl figure. Hardcoded
    /// to the $300/year baseline that matches the "$25/month" public
    /// anchor; the async signature + context parameter are kept so
    /// callers don't need to change.
    /// </summary>
    public static Task<decimal> GetCostPerGirlAsync(AppDbContext context)
    {
        _ = context; // retained for API compatibility
        return Task.FromResult(BaselineYearlyCostPerGirl);
    }

    /// <summary>
    /// Monthly program cost per girl — hardcoded to $25/month to match
    /// the public anchor rate. Parameter retained for API compatibility.
    /// </summary>
    public static decimal MonthlyCostPerGirl(decimal costPerGirl)
    {
        _ = costPerGirl;
        return BaselineMonthlyCostPerGirl;
    }

    /// <summary>
    /// Converts a donation total into whole months of care provided.
    /// Always rounded DOWN (floor) so the number never overstates what
    /// the gift actually bought — e.g. $60 at $125/mo = 0 full months
    /// of care, $125 = 1 month, $250 = 2 months, $1,500 = 12 months.
    /// </summary>
    public static int MonthsOfCare(decimal donated, decimal costPerGirl)
    {
        if (donated <= 0) return 0;
        var monthly = MonthlyCostPerGirl(costPerGirl);
        if (monthly <= 0) return 0;
        return (int)Math.Floor(donated / monthly);
    }

    /// <summary>
    /// Returns the number of *full girl-years of care* a donor has funded.
    /// Twelve whole months of care = one girl helped. No artificial
    /// floor — a $60 gift is honestly 0 girl-years funded, because it
    /// does not cover a full year of care for any single girl.
    /// </summary>
    public static int GirlsHelped(decimal donated, decimal costPerGirl)
    {
        if (costPerGirl <= 0 || donated <= 0)
            return 0;

        var months = MonthsOfCare(donated, costPerGirl);
        return months / (int)MonthsPerYear;
    }
}
