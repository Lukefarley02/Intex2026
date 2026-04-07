namespace Intex2026.Api.Models;

public class ProcessRecording
{
    public int ProcessRecordingId { get; set; }
    public int ResidentId { get; set; }
    public DateTime SessionDate { get; set; }
    public string? SessionType { get; set; }
    public string? Notes { get; set; }
    public string? CreatedBy { get; set; }

    // Navigation
    public Resident? Resident { get; set; }
}
