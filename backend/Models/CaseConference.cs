using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace Intex2026.Api.Models;

[Table("case_conferences")]
public class CaseConference
{
    [Column("conference_id")]
    public int ConferenceId { get; set; }

    [Column("resident_id")]
    public int ResidentId { get; set; }

    [Column("conference_date")]
    public DateTime? ConferenceDate { get; set; }

    [Column("attendees")]
    public string? Attendees { get; set; }

    [Column("conference_notes")]
    public string? ConferenceNotes { get; set; }

    [Column("next_review_date")]
    public DateTime? NextReviewDate { get; set; }

    [Column("assigned_to")]
    public string? AssignedTo { get; set; }

    /// <summary>Open | Pending Review | Closed</summary>
    [Column("status")]
    public string Status { get; set; } = "Open";

    [Column("created_by_user_id")]
    public string? CreatedByUserId { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
