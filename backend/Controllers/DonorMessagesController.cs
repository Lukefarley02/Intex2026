using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Intex2026.Api.Authorization;
using Intex2026.Api.Data;
using Intex2026.Api.Models;

namespace Intex2026.Api.Controllers;

/// <summary>
/// Admin-facing endpoints for sending templated in-app messages to donors.
/// Messages land in the donor portal's notification inbox.
/// </summary>
[ApiController]
[Route("api/donor-messages")]
[Authorize(Roles = "Admin")]
public class DonorMessagesController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;

    public DonorMessagesController(AppDbContext context, UserManager<ApplicationUser> userManager)
    {
        _context = context;
        _userManager = userManager;
    }

    // ---- DTOs ----

    public class SendMessageRequest
    {
        public int SupporterId { get; set; }
        public string TemplateType { get; set; } = string.Empty;  // "ThankYou" | "Appeal"
        public string Subject { get; set; } = string.Empty;
        public string Body { get; set; } = string.Empty;
    }

    public class BulkSendRequest
    {
        /// <summary>List of supporter IDs to message.</summary>
        public List<int> SupporterIds { get; set; } = new();
        public string TemplateType { get; set; } = string.Empty;
        public string Subject { get; set; } = string.Empty;
        public string Body { get; set; } = string.Empty;
    }

    // POST /api/donor-messages
    // Send a single message to one donor.
    [HttpPost]
    public async Task<IActionResult> SendMessage([FromBody] SendMessageRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Subject) || string.IsNullOrWhiteSpace(req.Body))
            return BadRequest(new { message = "Subject and body are required." });

        // Verify the supporter exists
        var supporter = await _context.Supporters
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.SupporterId == req.SupporterId);

        if (supporter == null)
            return NotFound(new { message = "Supporter not found." });

        var user = await _userManager.GetUserAsync(User);
        var senderName = user?.Email ?? "Admin";

        var nextId = await _context.DonorMessages.AnyAsync()
            ? await _context.DonorMessages.MaxAsync(m => m.MessageId) + 1
            : 1;

        var msg = new DonorMessage
        {
            MessageId = nextId,
            SupporterId = req.SupporterId,
            SenderUserId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "",
            SenderName = senderName,
            TemplateType = req.TemplateType,
            Subject = req.Subject,
            Body = req.Body,
            IsRead = false,
            CreatedAt = DateTime.UtcNow,
        };

        _context.DonorMessages.Add(msg);
        await _context.SaveChangesAsync();

        return Ok(new { messageId = msg.MessageId, sentTo = supporter.DisplayName ?? supporter.Email });
    }

    // POST /api/donor-messages/bulk
    // Send the same message to multiple donors at once.
    [HttpPost("bulk")]
    public async Task<IActionResult> BulkSend([FromBody] BulkSendRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Subject) || string.IsNullOrWhiteSpace(req.Body))
            return BadRequest(new { message = "Subject and body are required." });

        if (req.SupporterIds.Count == 0)
            return BadRequest(new { message = "At least one supporter ID is required." });

        // Verify all supporters exist
        var validIds = await _context.Supporters
            .AsNoTracking()
            .Where(s => req.SupporterIds.Contains(s.SupporterId))
            .Select(s => s.SupporterId)
            .ToListAsync();

        if (validIds.Count == 0)
            return BadRequest(new { message = "No valid supporters found." });

        var user = await _userManager.GetUserAsync(User);
        var senderName = user?.Email ?? "Admin";
        var senderUserId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";

        var currentMax = await _context.DonorMessages.AnyAsync()
            ? await _context.DonorMessages.MaxAsync(m => m.MessageId)
            : 0;

        var messages = new List<DonorMessage>();
        foreach (var sid in validIds)
        {
            currentMax++;
            messages.Add(new DonorMessage
            {
                MessageId = currentMax,
                SupporterId = sid,
                SenderUserId = senderUserId,
                SenderName = senderName,
                TemplateType = req.TemplateType,
                Subject = req.Subject,
                Body = req.Body,
                IsRead = false,
                CreatedAt = DateTime.UtcNow,
            });
        }

        _context.DonorMessages.AddRange(messages);
        await _context.SaveChangesAsync();

        return Ok(new { sent = messages.Count, skipped = req.SupporterIds.Count - validIds.Count });
    }
}
