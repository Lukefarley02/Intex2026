using System.ComponentModel.DataAnnotations.Schema;

namespace Intex2026.Api.Models;

[Table("supporters")]
public class Supporter
{
    [Column("supporter_id")]
    public int SupporterId { get; set; }

    [Column("supporter_type")]
    public string SupporterType { get; set; } = string.Empty;

    [Column("display_name")]
    public string DisplayName { get; set; } = string.Empty;

    [Column("organization_name")]
    public string? OrganizationName { get; set; }

    [Column("first_name")]
    public string FirstName { get; set; } = string.Empty;

    [Column("last_name")]
    public string LastName { get; set; } = string.Empty;

    [Column("relationship_type")]
    public string RelationshipType { get; set; } = string.Empty;

    [Column("region")]
    public string Region { get; set; } = string.Empty;

    [Column("country")]
    public string Country { get; set; } = string.Empty;

    [Column("email")]
    public string Email { get; set; } = string.Empty;

    [Column("phone")]
    public string? Phone { get; set; }

    [Column("status")]
    public string? Status { get; set; }

    [Column("created_at")]
    public DateTime? CreatedAt { get; set; }

    [Column("first_donation_date")]
    public DateTime? FirstDonationDate { get; set; }

    [Column("acquisition_channel")]
    public string? AcquisitionChannel { get; set; }
}
