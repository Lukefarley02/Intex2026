using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Intex2026.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSocialMediaPosts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Use IF NOT EXISTS so this migration is safe to run against an Azure SQL
            // database that already has the table from lighthouse_schema.sql.
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='social_media_posts' AND xtype='U')
                BEGIN
                    CREATE TABLE social_media_posts (
                        post_id                      INT             PRIMARY KEY,
                        platform                     NVARCHAR(30)    NOT NULL,
                        created_at                   DATETIME2       NOT NULL,
                        post_type                    NVARCHAR(50)    NOT NULL,
                        media_type                   NVARCHAR(20)    NOT NULL,
                        has_call_to_action           BIT             NOT NULL DEFAULT 0,
                        content_topic                NVARCHAR(50)    NULL,
                        sentiment_tone               NVARCHAR(30)    NULL,
                        features_resident_story      BIT             NOT NULL DEFAULT 0,
                        campaign_name                NVARCHAR(200)   NULL,
                        is_boosted                   BIT             NOT NULL DEFAULT 0,
                        impressions                  INT             NOT NULL DEFAULT 0,
                        reach                        INT             NOT NULL DEFAULT 0,
                        likes                        INT             NOT NULL DEFAULT 0,
                        comments                     INT             NOT NULL DEFAULT 0,
                        shares                       INT             NOT NULL DEFAULT 0,
                        click_throughs               INT             NOT NULL DEFAULT 0,
                        engagement_rate              DECIMAL(8,6)    NULL,
                        donation_referrals           INT             NOT NULL DEFAULT 0,
                        estimated_donation_value_php DECIMAL(12,2)   NULL,
                        follower_count_at_post       INT             NULL
                    );

                    CREATE INDEX IX_social_media_posts_platform ON social_media_posts(platform);
                    CREATE INDEX IX_social_media_posts_date     ON social_media_posts(created_at);
                    CREATE INDEX IX_social_media_posts_type     ON social_media_posts(post_type);
                END
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "social_media_posts");
        }
    }
}
