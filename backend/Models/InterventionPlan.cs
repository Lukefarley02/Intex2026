using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace Intex2026.Api.Models;

[Table("intervention_plans")]
public class InterventionPlan
{
    [Column("plan_id")]
    public int PlanId { get; set; }

    [Column("resident_id")]
    public int ResidentId { get; set; }

    /// <summary>FK to case_conferences — null for legacy rows not tied to a conference.</summary>
    [Column("conference_id")]
    public int? ConferenceId { get; set; }

    /// <summary>Safety | Education | Physical Health | Mental Health</summary>
    [Column("plan_category")]
    public string PlanCategory { get; set; } = "";

    [Column("plan_description")]
    public string? PlanDescription { get; set; }

    /// <summary>Comma-separated services: Healing, Legal, Teaching, etc.</summary>
    [Column("services_provided")]
    public string? ServicesProvided { get; set; }

    [Column("target_value")]
    public decimal? TargetValue { get; set; }

    [Column("target_date")]
    public DateTime? TargetDate { get; set; }

    /// <summary>On Hold | In Progress | Completed</summary>
    [Column("status")]
    public string Status { get; set; } = "In Progress";

    /// <summary>Low | Medium | High | Urgent</summary>
    [Column("priority")]
    public string? Priority { get; set; }

    [Column("progress_notes")]
    public string? ProgressNotes { get; set; }

    [Column("assigned_to")]
    public string? AssignedTo { get; set; }

    /// <summary>Legacy column — date of the associated conference before FK was added.</summary>
    [Column("case_conference_date")]
    public DateTime? CaseConferenceDate { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
