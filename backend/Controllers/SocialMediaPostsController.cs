using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Intex2026.Api.Data;

namespace Intex2026.Api.Controllers;

/// <summary>
/// Social media analytics. Returns aggregated stats derived from the
/// social_media_posts table. Staff/Admin only — data is internally collected.
/// </summary>
[ApiController]
[Route("api/social")]
[Authorize(Roles = "Admin,Staff")]
public class SocialMediaPostsController : ControllerBase
{
    private readonly AppDbContext _context;

    public SocialMediaPostsController(AppDbContext context)
    {
        _context = context;
    }

    // GET /api/social/stats
    // Returns aggregate social media KPIs for the admin dashboard overview card.
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var posts = _context.SocialMediaPosts.AsNoTracking();

        var totalPosts = await posts.CountAsync();

        // If table is empty (not yet seeded), return zeros gracefully.
        if (totalPosts == 0)
        {
            return Ok(new
            {
                totalPosts = 0,
                totalReach = 0L,
                avgEngagementRate = 0.0,
                totalClickThroughs = 0L,
                totalDonationReferrals = 0L,
                estimatedDonationValuePhp = 0m,
                platformBreakdown = Array.Empty<object>(),
                topPostTypes = Array.Empty<object>()
            });
        }

        var totalReach = await posts.SumAsync(p => (long)p.Reach);
        var totalClicks = await posts.SumAsync(p => (long)p.ClickThroughs);
        var totalReferrals = await posts.SumAsync(p => (long)p.DonationReferrals);
        var estimatedValue = await posts.SumAsync(p => p.EstimatedDonationValuePhp ?? 0m);

        // Avg engagement rate across posts that have data
        var engagementPosts = await posts
            .Where(p => p.EngagementRate.HasValue)
            .Select(p => (double)p.EngagementRate!.Value)
            .ToListAsync();
        var avgEngagementRate = engagementPosts.Count > 0
            ? engagementPosts.Average()
            : 0.0;

        // Per-platform breakdown
        var platformBreakdown = await posts
            .GroupBy(p => p.Platform)
            .Select(g => new
            {
                platform = g.Key,
                postCount = g.Count(),
                totalReach = g.Sum(p => (long)p.Reach),
                avgEngagementRate = g.Where(p => p.EngagementRate.HasValue)
                                     .Average(p => (double?)p.EngagementRate) ?? 0.0,
                donationReferrals = g.Sum(p => (long)p.DonationReferrals)
            })
            .OrderByDescending(g => g.totalReach)
            .ToListAsync();

        // Top 3 post types by avg estimated donation value
        var topPostTypes = await posts
            .GroupBy(p => p.PostType)
            .Select(g => new
            {
                postType = g.Key,
                avgDonationValue = g.Average(p => p.EstimatedDonationValuePhp ?? 0m),
                postCount = g.Count()
            })
            .OrderByDescending(g => g.avgDonationValue)
            .Take(3)
            .ToListAsync();

        return Ok(new
        {
            totalPosts,
            totalReach,
            avgEngagementRate,
            totalClickThroughs = totalClicks,
            totalDonationReferrals = totalReferrals,
            estimatedDonationValuePhp = estimatedValue,
            platformBreakdown,
            topPostTypes
        });
    }
}
