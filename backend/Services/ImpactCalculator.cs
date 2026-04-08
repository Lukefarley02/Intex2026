using Intex2026.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Intex2026.Api.Services;

/// <summary>
/// Computes the "girls helped" impact metric from live database values.
///
/// Formula:
///   cost_per_girl  = total program funding raised ÷ total girls ever served
///   girls_helped   = donor_total_donated ÷ cost_per_girl  (rounded, min 0)
///
/// Using actual DB totals means the number updates automatically every time a
/// new donation is recorded or a new resident is admitted — no hardcoded rate.
/// A fallback floor of $500 is applied if data is too sparse to produce a
/// meaningful ratio (e.g. during initial seeding).
/// </summary>
public static class ImpactCalculator
{
    private const decimal FallbackCostPerGirl = 1_500m;
    private const decimal MinimumCostPerGirl  =   500m;

    /// <summary>
    /// Returns the current program-wide cost-per-girl figure derived from the DB.
    /// </summary>
    public static async Task<decimal> GetCostPerGirlAsync(AppDbContext context)
    {
        var totalRaised = await context.Donations
            .AsNoTracking()
            .SumAsync(d => (decimal?)(d.Amount ?? d.EstimatedValue ?? 0m)) ?? 0m;

        var totalGirlsServed = await context.Residents
            .AsNoTracking()
            .CountAsync();

        if (totalRaised <= 0 || totalGirlsServed <= 0)
            return FallbackCostPerGirl;

        var rate = totalRaised / totalGirlsServed;
        // Floor: never report a rate that is unrealistically low (synthetic data artefact)
        return Math.Max(rate, MinimumCostPerGirl);
    }

    /// <summary>
    /// Converts a donation total into an estimated number of girls helped.
    /// </summary>
    public static int GirlsHelped(decimal donated, decimal costPerGirl)
    {
        if (costPerGirl <= 0 || donated <= 0)
            return 0;
        return (int)Math.Round(donated / costPerGirl);
    }
}
