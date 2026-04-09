using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Intex2026.Api.Models;

[Table("intervention_plans")]
public class InterventionPlan
{
    [Key]
    [Column("plan_id")]
    public int PlanId { get; set; }

    [Column("resident_id")]
    public int ResidentId { get; set; }

    /// <summary>Safety | Education | Physical Health | Mental Health</summary>
    [Column("plan_category")]
    public string PlanCategory { get; set; } = "Safety";

    [Column("plan_description")]
    public string? PlanDescription { get; set; }

    /// <summary>Comma-separated services: Healing, Legal, Teaching, etc.</summary>
    [Column("services_provided")]
    public string? ServicesProvided { get; set; }

    [Column("target_value")]
    public decimal? TargetValue { get; set; }

    [Column("target_date")]
    public DateTime? TargetDate { get; set; }

    [Column("status")]
    public string Status { get; set; } = "In Progress";

    [Column("case_conference_date")]
    public DateTime? CaseConferenceDate { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }

    // Identity user id of the staff/admin who originally created this record.
    // Nullable so historical rows from seed data (pre-migration) still load.
    [Column("created_by_user_id")]
    public string? CreatedByUserId { get; set; }
}
