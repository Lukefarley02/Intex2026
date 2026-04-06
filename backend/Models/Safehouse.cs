namespace Intex2026.Api.Models;

public class Safehouse
{
    public int SafehouseId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Location { get; set; }
    public int Capacity { get; set; }
    public string? Status { get; set; }  // active, inactive

    // Navigation
    public ICollection<Resident> Residents { get; set; } = new List<Resident>();
}
