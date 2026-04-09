using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Intex2026.Api.Data;

#nullable disable

namespace Intex2026.Api.Migrations
{
    // NOTE: EF Core only recognises a class as a migration when it is tagged
    // with both [DbContext] and [Migration]. Normally those attributes live
    // on the sibling *.Designer.cs file that `dotnet ef migrations add`
    // scaffolds — but we're authoring this migration by hand (no dotnet CLI
    // available in this sandbox), so we add the attributes directly to the
    // class. Without them `GetPendingMigrationsAsync` would return an empty
    // list and the column would never be created on startup.
    [DbContext(typeof(AppDbContext))]
    [Migration("20260408180000_AddCreatedByUserId")]
    /// <inheritdoc />
    public partial class AddCreatedByUserId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add `created_by_user_id` to process_recordings and home_visitations
            // so Staff ownership of a record can be enforced on update/delete.
            // Wrapped in IF NOT EXISTS so the migration is safe to re-run against
            // an Azure SQL database that already has the column (mirrors the
            // pattern used by AddSocialMediaPosts).
            migrationBuilder.Sql(@"
                IF NOT EXISTS (
                    SELECT 1 FROM sys.columns
                    WHERE Name = N'created_by_user_id'
                      AND Object_ID = Object_ID(N'dbo.process_recordings')
                )
                BEGIN
                    ALTER TABLE process_recordings
                    ADD created_by_user_id NVARCHAR(450) NULL;
                END
            ");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (
                    SELECT 1 FROM sys.columns
                    WHERE Name = N'created_by_user_id'
                      AND Object_ID = Object_ID(N'dbo.home_visitations')
                )
                BEGIN
                    ALTER TABLE home_visitations
                    ADD created_by_user_id NVARCHAR(450) NULL;
                END
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF EXISTS (
                    SELECT 1 FROM sys.columns
                    WHERE Name = N'created_by_user_id'
                      AND Object_ID = Object_ID(N'dbo.process_recordings')
                )
                BEGIN
                    ALTER TABLE process_recordings DROP COLUMN created_by_user_id;
                END
            ");
            migrationBuilder.Sql(@"
                IF EXISTS (
                    SELECT 1 FROM sys.columns
                    WHERE Name = N'created_by_user_id'
                      AND Object_ID = Object_ID(N'dbo.home_visitations')
                )
                BEGIN
                    ALTER TABLE home_visitations DROP COLUMN created_by_user_id;
                END
            ");
        }
    }
}
