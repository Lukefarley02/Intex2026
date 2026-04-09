using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Intex2026.Api.Models;

/// <summary>
/// In-app message sent by an admin to a donor. Displayed inside the
/// donor portal's notification inbox. Messages are soft-typed via
/// <see cref="TemplateType"/> so the frontend can render appropriate
/// icons/colors per template category.
/// </summary>
[Table("donor_messages")]
public class DonorMessage
{
    [Key]
    [Column("message_id")]
    public int MessageId { get; set; }

    /// <summary>FK to supporters.supporter_id — the recipient donor.</summary>
    [Column("supporter_id")]
    public int SupporterId { get; set; }

    /// <summary>Identity user ID of the admin who sent the message.</summary>
    [Column("sender_user_id")]
    public string SenderUserId { get; set; } = string.Empty;

    /// <summary>Display name of the sender at time of send (denormalized so
    /// it survives account changes).</summary>
    [Column("sender_name")]
    public string SenderName { get; set; } = string.Empty;

    /// <summary>"ThankYou" or "Appeal" — matches the template picker on the
    /// admin side. Nullable for future custom/free-text messages.</summary>
    [Column("template_type")]
    public string? TemplateType { get; set; }

    [Column("subject")]
    public string Subject { get; set; } = string.Empty;

    [Column("body")]
    public string Body { get; set; } = string.Empty;

    [Column("is_read")]
    public bool IsRead { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("read_at")]
    public DateTime? ReadAt { get; set; }
}
