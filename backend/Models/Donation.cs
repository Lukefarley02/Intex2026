namespace Intex2026.Api.Models;

public class Donation
{
    public int DonationId { get; set; }
    public int SupporterId { get; set; }
    public decimal Amount { get; set; }
    public DateTime DonationDate { get; set; }
    public string? DonationType { get; set; }  // one-time, recurring, in-kind
    public string? Campaign { get; set; }

    // Navigation
    public Supporter? Supporter { get; set; }
}
