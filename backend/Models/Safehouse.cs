using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Intex2026.Api.Models;

[Table("safehouses")]
public class Safehouse
{
    [Key]
    [Column("safehouse_id")]
    public int SafehouseId { get; set; }

    [Column("safehouse_code")]
    public string? SafehouseCode { get; set; }

    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Column("region")]
    public string? Region { get; set; }

    [Column("city")]
    public string? City { get; set; }

    [Column("province")]
    public string? Province { get; set; }

    [Column("country")]
    public string? Country { get; set; }

    [Column("open_date")]
    public DateTime? OpenDate { get; set; }

    [Column("status")]
    public string? Status { get; set; }

    [Column("capacity_girls")]
    public int? CapacityGirls { get; set; }

    [Column("capacity_staff")]
    public int? CapacityStaff { get; set; }

    [Column("current_occupancy")]
    public int? CurrentOccupancy { get; set; }

    [Column("notes")]
    public string? Notes { get; set; }
}
