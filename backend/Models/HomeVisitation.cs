using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Intex2026.Api.Models;

[Table("home_visitations")]
public class HomeVisitation
{
    [Key]
    [Column("visitation_id")]
    public int VisitationId { get; set; }

    [Column("resident_id")]
    public int ResidentId { get; set; }

    [Column("visit_date")]
    public DateTime? VisitDate { get; set; }

    [Column("visit_type")]
    public string? VisitType { get; set; }

    [Column("purpose")]
    public string? Purpose { get; set; }

    [Column("location_visited")]
    public string? LocationVisited { get; set; }

    [Column("family_members_present")]
    public string? FamilyMembersPresent { get; set; }

    [Column("family_cooperation_level")]
    public string? FamilyCooperationLevel { get; set; }

    [Column("observations")]
    public string? Observations { get; set; }

    [Column("safety_concerns_noted")]
    public bool? SafetyConcernsNoted { get; set; }

    [Column("follow_up_needed")]
    public bool? FollowUpNeeded { get; set; }

    [Column("follow_up_notes")]
    public string? FollowUpNotes { get; set; }

    [Column("visit_outcome")]
    public string? VisitOutcome { get; set; }

    [Column("social_worker")]
    public string? SocialWorker { get; set; }
}
