namespace Intex2026.Api.Models;

public class HomeVisitation
{
    public int HomeVisitationId { get; set; }
    public int ResidentId { get; set; }
    public DateTime VisitDate { get; set; }
    public string? VisitType { get; set; }
    public string? Findings { get; set; }
    public string? ConductedBy { get; set; }

    // Navigation
    public Resident? Resident { get; set; }
}
