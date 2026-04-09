using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Intex2026.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddDonorMessages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Table creation moved to Program.cs startup (raw SQL with
            // IF NOT EXISTS) so it works without the EF Core CLI.
            // This migration is intentionally empty.
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
