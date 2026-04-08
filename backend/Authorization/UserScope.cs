using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Intex2026.Api.Data;
using Intex2026.Api.Models;

namespace Intex2026.Api.Authorization;

/// <summary>
/// Represents the organizational reach of the calling user. Built from the
/// ApplicationUser's Region/City columns plus their roles.
///
/// Access tiers (per the access-control chart):
///
///   Admin + Region == null + City == null  →  Founder         (all locations)
///   Admin + Region != null + City == null  →  Regional Manager (one region, every city in it)
///   Admin + Region != null + City != null  →  Location Manager (single city)
///   Staff                                  →  must have City — sees their city only
///   Donor                                  →  no case data; limited to their own giving history
/// </summary>
public sealed class UserScope
{
    public enum ScopeLevel
    {
        Founder,           // company-wide admin
        RegionalManager,   // admin scoped to a region
        LocationManager,   // admin scoped to a city
        Staff,             // staff scoped to a city
        Donor,             // donor — case data hidden
        None               // unauthenticated / unknown
    }

    public string? Region { get; }
    public string? City { get; }
    public ScopeLevel Level { get; }
    public bool IsAdmin => Level == ScopeLevel.Founder
                        || Level == ScopeLevel.RegionalManager
                        || Level == ScopeLevel.LocationManager;
    public bool IsFounder => Level == ScopeLevel.Founder;
    public bool IsStaff => Level == ScopeLevel.Staff;
    public bool IsDonor => Level == ScopeLevel.Donor;

    /// <summary>True when the caller can see every region/city.</summary>
    public bool IsCompanyWide => Level == ScopeLevel.Founder;

    /// <summary>Human-readable label for /api/auth/me.</summary>
    public string Label => Level switch
    {
        ScopeLevel.Founder         => "founder",
        ScopeLevel.RegionalManager => "region",
        ScopeLevel.LocationManager => "location",
        ScopeLevel.Staff           => "staff",
        ScopeLevel.Donor           => "donor",
        _                          => "none"
    };

    private UserScope(ScopeLevel level, string? region, string? city)
    {
        Level = level;
        Region = region;
        City = city;
    }

    /// <summary>
    /// Build a UserScope from the current HTTP request's principal. Reads
    /// the Region/City columns off ApplicationUser via UserManager. Returns
    /// <see cref="ScopeLevel.None"/> for unauthenticated callers.
    /// </summary>
    public static async Task<UserScope> FromPrincipalAsync(
        ClaimsPrincipal principal,
        UserManager<ApplicationUser> users)
    {
        if (principal?.Identity == null || !principal.Identity.IsAuthenticated)
            return new UserScope(ScopeLevel.None, null, null);

        var user = await users.FindByNameAsync(principal.Identity.Name!)
                ?? await users.FindByEmailAsync(principal.Identity.Name!);
        if (user == null) return new UserScope(ScopeLevel.None, null, null);

        var roles = await users.GetRolesAsync(user);

        // Admin wins over Staff which wins over Donor when computing scope
        if (roles.Contains("Admin"))
        {
            if (string.IsNullOrWhiteSpace(user.Region) && string.IsNullOrWhiteSpace(user.City))
                return new UserScope(ScopeLevel.Founder, null, null);
            if (string.IsNullOrWhiteSpace(user.City))
                return new UserScope(ScopeLevel.RegionalManager, user.Region, null);
            return new UserScope(ScopeLevel.LocationManager, user.Region, user.City);
        }
        if (roles.Contains("Staff"))
            return new UserScope(ScopeLevel.Staff, user.Region, user.City);
        if (roles.Contains("Donor"))
            return new UserScope(ScopeLevel.Donor, user.Region, user.City);

        return new UserScope(ScopeLevel.None, user.Region, user.City);
    }

    // ── Query filters ─────────────────────────────────────────────────────────
    //
    // Each helper takes an IQueryable and returns a possibly-narrowed
    // IQueryable that matches the caller's scope. Founders pass through
    // unchanged. Region/Location managers and Staff are restricted by
    // matching on the relevant column. Donors are denied entirely (empty).
    //
    // Comparisons use case-insensitive string matching because Region/City
    // values come from free-text columns and may differ in casing across
    // tables.

    public IQueryable<Safehouse> ApplyToSafehouses(IQueryable<Safehouse> q)
    {
        if (IsCompanyWide) return q;
        if (Level == ScopeLevel.RegionalManager && !string.IsNullOrEmpty(Region))
            return q.Where(s => s.Region != null && s.Region.ToLower() == Region!.ToLower());
        if ((Level == ScopeLevel.LocationManager || Level == ScopeLevel.Staff)
            && !string.IsNullOrEmpty(City))
            return q.Where(s => s.City != null && s.City.ToLower() == City!.ToLower());
        // Donor or unscoped staff/admin: deny.
        return q.Where(s => false);
    }

    public IQueryable<Resident> ApplyToResidents(
        IQueryable<Resident> q,
        DbSet<Safehouse> safehouses)
    {
        if (IsCompanyWide) return q;

        // Residents are scoped through their safehouse's region/city.
        if (Level == ScopeLevel.RegionalManager && !string.IsNullOrEmpty(Region))
        {
            var ids = safehouses
                .Where(sh => sh.Region != null && sh.Region.ToLower() == Region!.ToLower())
                .Select(sh => sh.SafehouseId);
            return q.Where(r => ids.Contains(r.SafehouseId));
        }
        if ((Level == ScopeLevel.LocationManager || Level == ScopeLevel.Staff)
            && !string.IsNullOrEmpty(City))
        {
            var ids = safehouses
                .Where(sh => sh.City != null && sh.City.ToLower() == City!.ToLower())
                .Select(sh => sh.SafehouseId);
            return q.Where(r => ids.Contains(r.SafehouseId));
        }
        return q.Where(r => false);
    }

    public IQueryable<Supporter> ApplyToSupporters(IQueryable<Supporter> q)
    {
        if (IsCompanyWide) return q;

        if (Level == ScopeLevel.RegionalManager && !string.IsNullOrEmpty(Region))
            return q.Where(s => s.Region != null && s.Region.ToLower() == Region!.ToLower());

        // Location Manager + Staff are scoped by Region too — supporters do
        // not store a city, only a region (see schema).
        if ((Level == ScopeLevel.LocationManager || Level == ScopeLevel.Staff)
            && !string.IsNullOrEmpty(Region))
            return q.Where(s => s.Region != null && s.Region.ToLower() == Region!.ToLower());

        return q.Where(s => false);
    }

    /// <summary>
    /// Returns true if the caller is allowed to see the given resident.
    /// Used by single-record endpoints (GET/PUT/DELETE by id).
    /// </summary>
    public bool CanAccessSafehouseRow(Safehouse? sh)
    {
        if (sh == null) return false;
        if (IsCompanyWide) return true;
        if (Level == ScopeLevel.RegionalManager)
            return string.Equals(sh.Region, Region, StringComparison.OrdinalIgnoreCase);
        if (Level == ScopeLevel.LocationManager || Level == ScopeLevel.Staff)
            return string.Equals(sh.City, City, StringComparison.OrdinalIgnoreCase);
        return false;
    }
}
