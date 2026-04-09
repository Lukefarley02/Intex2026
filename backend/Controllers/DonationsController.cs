using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Intex2026.Api.Authorization;
using Intex2026.Api.Data;
using Intex2026.Api.Models;

namespace Intex2026.Api.Controllers;

// DonationsController
//
// Single-purpose controller that lets **Admin or Staff** log an in-person
// donation on behalf of a supporter. This is the backend for the
// "Log donation" button that appears on the admin Donors page and on the
// Staff Dashboard. It intentionally does NOT expose a general listing
// endpoint — DonorPortalController, DashboardController, and
// SupportersController already handle reads — so Staff access stays as
// narrow as possible.
//
// Flow:
//   1. Staff picks an existing supporter by id, OR
//   2. Staff provides a new supporter payload and we create it inline.
//   3. Either way, a Donation row is inserted (non-identity PK generated
//      server-side via MaxAsync + 1, same pattern as
//      ProcessRecordingsController / PublicController).
//
// Scope rules:
//   - Admin (any tier) can log donations for any supporter in their scope.
//   - Staff can log donations ONLY for supporters in their region. They
//     cannot move a supporter out of their region, and new supporters they
//     create are force-stamped with their own region.
//   - A "Log donation" flow is the ONLY path by which Staff can create a
//     MonetaryDonor or InKindDonor supporter. SupportersController's
//     direct POST still blocks Staff from creating those types.
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Staff")]
public class DonationsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly UserManager<ApplicationUser> _users;

    private static readonly string[] AllowedDonationTypes = { "Monetary", "InKind" };
    private static readonly string[] AllowedSupporterTypes = { "MonetaryDonor", "InKindDonor" };

    public DonationsController(AppDbContext context, UserManager<ApplicationUser> users)
    {
        _context = context;
        _users = users;
    }

    // ---------- Temporary password generator ----------
    //
    // Generates a cryptographically-random temporary password that satisfies
    // the hardened Identity policy configured in Program.cs:
    //   length >= 14, upper, lower, digit, non-alphanumeric, 6+ unique chars.
    //
    // The structure guarantees at least 4 uppercase, 4 lowercase, 4 digits,
    // and 2 symbols (14 chars total), then fisher-yates shuffles the result
    // so the placement isn't predictable. Ambiguous glyphs (0/O/1/l/I) are
    // excluded so staff can read it off a screen to a donor without
    // confusion.
    private static string GenerateTempPassword()
    {
        const string upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        const string lower = "abcdefghijkmnopqrstuvwxyz";
        const string digit = "23456789";
        const string symbol = "!@#$%^&*?";

        var chars = new List<char>(14);
        chars.AddRange(PickRandom(upper, 4));
        chars.AddRange(PickRandom(lower, 4));
        chars.AddRange(PickRandom(digit, 4));
        chars.AddRange(PickRandom(symbol, 2));

        // Fisher-Yates shuffle with crypto RNG
        for (int i = chars.Count - 1; i > 0; i--)
        {
            int j = RandomNumberGenerator.GetInt32(0, i + 1);
            (chars[i], chars[j]) = (chars[j], chars[i]);
        }
        return new string(chars.ToArray());
    }

    private static IEnumerable<char> PickRandom(string pool, int count)
    {
        for (int i = 0; i < count; i++)
            yield return pool[RandomNumberGenerator.GetInt32(0, pool.Length)];
    }

    // ---------- DTOs ----------

    public sealed class NewSupporterDto
    {
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? OrganizationName { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Region { get; set; }
        public string? Country { get; set; }
        /// <summary>MonetaryDonor or InKindDonor.</summary>
        public string? SupporterType { get; set; }
    }

    public sealed class LogDonationRequest
    {
        /// <summary>Existing supporter id. Mutually exclusive with NewSupporter.</summary>
        public int? SupporterId { get; set; }
        /// <summary>Inline payload to create a new supporter. Mutually exclusive with SupporterId.</summary>
        public NewSupporterDto? NewSupporter { get; set; }

        /// <summary>"Monetary" or "InKind".</summary>
        public string DonationType { get; set; } = "Monetary";
        public decimal? Amount { get; set; }           // monetary gifts
        public decimal? EstimatedValue { get; set; }   // in-kind gifts (staff-entered fair market value)
        public DateTime? DonationDate { get; set; }
        public string? CampaignName { get; set; }
        public string? Notes { get; set; }             // item description for in-kind
        public string? CurrencyCode { get; set; }
        public bool IsRecurring { get; set; }
    }

    // ---------- POST /api/donations ----------

    [HttpPost]
    public async Task<IActionResult> LogDonation([FromBody] LogDonationRequest req)
    {
        if (req == null) return BadRequest(new { message = "Request body is required." });

        var scope = await UserScope.FromPrincipalAsync(User, _users);
        if (scope.Level == UserScope.ScopeLevel.None || scope.IsDonor)
            return Forbid();

        // Validate donation type
        if (string.IsNullOrWhiteSpace(req.DonationType)
            || !AllowedDonationTypes.Contains(req.DonationType))
        {
            return BadRequest(new { message = "donationType must be 'Monetary' or 'InKind'." });
        }

        var isInKind = string.Equals(req.DonationType, "InKind", StringComparison.OrdinalIgnoreCase);

        // Validate amount / estimated value
        if (isInKind)
        {
            if (req.EstimatedValue is not > 0m)
                return BadRequest(new { message = "In-kind donations require an estimatedValue greater than zero." });
        }
        else
        {
            if (req.Amount is not > 0m)
                return BadRequest(new { message = "Monetary donations require an amount greater than zero." });
        }

        // Resolve or create the supporter
        Supporter? supporter;
        bool createdNewSupporter = false;
        string? tempPassword = null;
        string? donorAccountEmail = null;

        if (req.SupporterId.HasValue)
        {
            supporter = await _context.Supporters
                .FirstOrDefaultAsync(s => s.SupporterId == req.SupporterId.Value);
            if (supporter == null) return NotFound(new { message = "Supporter not found." });

            // Scope check: Staff / Regional / Location are restricted by region.
            if (!IsSupporterInScope(supporter, scope))
                return Forbid();
        }
        else
        {
            if (req.NewSupporter == null)
                return BadRequest(new { message = "Either supporterId or newSupporter is required." });

            var ns = req.NewSupporter;

            // Force the supporter type to one of the two "donor" values.
            var supporterType = string.IsNullOrWhiteSpace(ns.SupporterType)
                ? (isInKind ? "InKindDonor" : "MonetaryDonor")
                : ns.SupporterType;
            if (!AllowedSupporterTypes.Contains(supporterType))
                return BadRequest(new { message = "supporterType must be MonetaryDonor or InKindDonor." });

            var firstName = (ns.FirstName ?? "").Trim();
            var lastName  = (ns.LastName ?? "").Trim();
            var org       = (ns.OrganizationName ?? "").Trim();

            if (firstName.Length == 0 && org.Length == 0)
                return BadRequest(new { message = "Donor name is required. Provide firstName/lastName or organizationName." });

            // Region: Staff / Regional / Location cannot create a supporter
            // outside their own region. Founders may use whatever region the
            // form supplies; otherwise we default to "In-Person".
            string region;
            if (scope.IsCompanyWide)
            {
                region = string.IsNullOrWhiteSpace(ns.Region) ? "In-Person" : ns.Region!.Trim();
            }
            else
            {
                region = scope.Region ?? "";
                if (string.IsNullOrWhiteSpace(region))
                    return Forbid();
            }

            var displayName = org.Length > 0
                ? org
                : (lastName.Length > 0 ? $"{firstName} {lastName}" : firstName);

            var nextSupporterId = (await _context.Supporters.AnyAsync())
                ? await _context.Supporters.MaxAsync(s => s.SupporterId) + 1
                : 1;

            supporter = new Supporter
            {
                SupporterId       = nextSupporterId,
                SupporterType     = supporterType,
                DisplayName       = displayName,
                OrganizationName  = org.Length > 0 ? org : null,
                FirstName         = firstName,
                LastName          = lastName,
                // Email is optional for in-person donors (in-kind walk-ins
                // may not give one). Empty string keeps the NOT NULL column
                // happy while still being distinguishable from a real email.
                Email             = (ns.Email ?? "").Trim(),
                Phone             = string.IsNullOrWhiteSpace(ns.Phone) ? null : ns.Phone!.Trim(),
                Region            = region,
                Country           = string.IsNullOrWhiteSpace(ns.Country) ? "Philippines" : ns.Country!.Trim(),
                RelationshipType  = "In-Person",
                AcquisitionChannel = "In-Person",
                CreatedAt         = DateTime.UtcNow,
                FirstDonationDate = req.DonationDate ?? DateTime.UtcNow,
                Status            = "Active",
            };
            _context.Supporters.Add(supporter);
            await _context.SaveChangesAsync();
            createdNewSupporter = true;

            // If staff provided a real email, also create a lightweight
            // Identity account so the donor can later log in and see their
            // giving history in the donor portal. We generate a random
            // temporary seed password and flag the account
            // `MustChangePassword = true` — on first login the frontend will
            // redirect the donor to Account Settings to set a permanent
            // password before any other navigation is allowed. The temp
            // password is returned once in the response so staff can share
            // it with the donor on the spot.
            var email = supporter.Email?.Trim() ?? "";
            var looksLikeEmail =
                email.Length > 0 &&
                email.Contains('@') &&
                !email.StartsWith("anonymous-", StringComparison.OrdinalIgnoreCase);

            if (looksLikeEmail)
            {
                var existing = await _users.FindByEmailAsync(email);
                if (existing == null)
                {
                    var seed = GenerateTempPassword();
                    var appUser = new ApplicationUser
                    {
                        UserName = email,
                        Email = email,
                        EmailConfirmed = true,
                        MustChangePassword = true,
                        // Donors are not scoped by region/city for access control.
                    };
                    var createResult = await _users.CreateAsync(appUser, seed);
                    if (createResult.Succeeded)
                    {
                        await _users.AddToRoleAsync(appUser, "Donor");
                        tempPassword = seed;
                        donorAccountEmail = email;
                    }
                    // If creation fails (e.g. password policy mismatch, which
                    // shouldn't happen because GenerateTempPassword satisfies
                    // the policy), we silently skip the Identity account —
                    // the donation itself still lands on the supporter row
                    // and a staff member can create the account later.
                }
            }
        }

        // Generate the next donation_id (non-identity PK in canonical schema)
        var nextDonationId = (await _context.Donations.AnyAsync())
            ? await _context.Donations.MaxAsync(d => d.DonationId) + 1
            : 1;

        var donation = new Donation
        {
            DonationId    = nextDonationId,
            SupporterId   = supporter.SupporterId,
            DonationType  = isInKind ? "InKind" : "Monetary",
            Amount        = isInKind ? null : req.Amount,
            EstimatedValue = isInKind ? req.EstimatedValue : (req.Amount ?? req.EstimatedValue),
            DonationDate  = req.DonationDate ?? DateTime.UtcNow,
            CurrencyCode  = string.IsNullOrWhiteSpace(req.CurrencyCode) ? "USD" : req.CurrencyCode,
            IsRecurring   = req.IsRecurring,
            CampaignName  = string.IsNullOrWhiteSpace(req.CampaignName) ? "General Fund" : req.CampaignName!.Trim(),
            ChannelSource = "In-Person",
            ImpactUnit    = isInKind ? "Items" : "USD",
            Notes         = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes!.Trim(),
        };
        _context.Donations.Add(donation);

        // Backfill the supporter's first_donation_date if it's still null
        // (old records with no giving history).
        if (supporter.FirstDonationDate == null)
        {
            supporter.FirstDonationDate = donation.DonationDate;
            _context.Supporters.Update(supporter);
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            donationId = donation.DonationId,
            supporterId = supporter.SupporterId,
            createdNewSupporter,
            donationType = donation.DonationType,
            amount = donation.Amount,
            estimatedValue = donation.EstimatedValue,
            donationDate = donation.DonationDate,
            // tempPassword / donorAccountEmail are non-null only when this
            // call also provisioned a brand-new Identity account (i.e. a new
            // supporter was created AND they supplied a valid email that
            // wasn't already tied to an existing Identity user). Staff must
            // share this password with the donor in person and warn them
            // that it is a one-time value — the donor will be forced to set
            // a new password on their first login.
            tempPassword,
            donorAccountEmail,
        });
    }

    // Region-scoping check for supporters — matches the read-side rule in
    // SupportersController.IsVisibleTo. Founders see everything; everyone
    // else is clamped to their own Region (supporters have no city).
    private static bool IsSupporterInScope(Supporter s, UserScope scope)
    {
        if (scope.IsCompanyWide) return true;
        if (string.IsNullOrWhiteSpace(scope.Region)) return false;
        return string.Equals(s.Region, scope.Region, StringComparison.OrdinalIgnoreCase);
    }
}
