using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Intex2026.Api.Data;
using Intex2026.Api.Models;

namespace Intex2026.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ResidentsController : ControllerBase
{
    private readonly AppDbContext _context;

    public ResidentsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Resident>>> GetResidents()
    {
        return await _context.Residents
            .Include(r => r.Safehouse)
            .ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Resident>> GetResident(int id)
    {
        var resident = await _context.Residents
            .Include(r => r.Safehouse)
            .FirstOrDefaultAsync(r => r.ResidentId == id);

        if (resident == null) return NotFound();
        return resident;
    }

    [HttpPost]
    public async Task<ActionResult<Resident>> CreateResident(Resident resident)
    {
        _context.Residents.Add(resident);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetResident), new { id = resident.ResidentId }, resident);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateResident(int id, Resident resident)
    {
        if (id != resident.ResidentId) return BadRequest();
        _context.Entry(resident).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteResident(int id)
    {
        var resident = await _context.Residents.FindAsync(id);
        if (resident == null) return NotFound();
        _context.Residents.Remove(resident);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
