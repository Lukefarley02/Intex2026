namespace Intex2026.Api.Models;

public class Resident
{
    public int ResidentId { get; set; }
    public int SafehouseId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public DateTime? DateOfBirth { get; set; }
    public DateTime AdmissionDate { get; set; }
    public string? Status { get; set; }  // active, reintegrated, transferred
    public string? RiskLevel { get; set; }  // low, medium, high, critical
    public string? NotesRestricted { get; set; }  // admin-only

    // Navigation
    public Safehouse? Safehouse { get; set; }
    public ICollection<ProcessRecording> ProcessRecordings { get; set; } = new List<ProcessRecording>();
    public ICollection<HomeVisitation> HomeVisitations { get; set; } = new List<HomeVisitation>();
}
