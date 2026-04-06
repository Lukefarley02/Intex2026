namespace Intex2026.Api.Models;

public class Supporter
{
    public int SupporterId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? SupporterType { get; set; }  // individual, corporate, foundation, church
    public DateTime? FirstContactDate { get; set; }

    // Navigation
    public ICollection<Donation> Donations { get; set; } = new List<Donation>();
}
