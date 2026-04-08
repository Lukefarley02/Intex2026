using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Intex2026.Api.Models;

[Table("social_media_posts")]
public class SocialMediaPost
{
    [Key]
    [Column("post_id")]
    public int PostId { get; set; }

    [Column("platform")]
    public string Platform { get; set; } = string.Empty;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("post_type")]
    public string PostType { get; set; } = string.Empty;

    [Column("media_type")]
    public string MediaType { get; set; } = string.Empty;

    [Column("has_call_to_action")]
    public bool HasCallToAction { get; set; }

    [Column("content_topic")]
    public string? ContentTopic { get; set; }

    [Column("sentiment_tone")]
    public string? SentimentTone { get; set; }

    [Column("features_resident_story")]
    public bool FeaturesResidentStory { get; set; }

    [Column("campaign_name")]
    public string? CampaignName { get; set; }

    [Column("is_boosted")]
    public bool IsBoosted { get; set; }

    [Column("impressions")]
    public int Impressions { get; set; }

    [Column("reach")]
    public int Reach { get; set; }

    [Column("likes")]
    public int Likes { get; set; }

    [Column("comments")]
    public int Comments { get; set; }

    [Column("shares")]
    public int Shares { get; set; }

    [Column("click_throughs")]
    public int ClickThroughs { get; set; }

    [Column("engagement_rate")]
    public decimal? EngagementRate { get; set; }

    [Column("donation_referrals")]
    public int DonationReferrals { get; set; }

    [Column("estimated_donation_value_php")]
    public decimal? EstimatedDonationValuePhp { get; set; }

    [Column("follower_count_at_post")]
    public int? FollowerCountAtPost { get; set; }
}
