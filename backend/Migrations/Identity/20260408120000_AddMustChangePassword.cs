using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Intex2026.Api.Data;

#nullable disable

namespace Intex2026.Api.Migrations.Identity
{
    /// <inheritdoc />
    [DbContext(typeof(IdentityContext))]
    [Migration("20260408120000_AddMustChangePassword")]
    public partial class AddMustChangePassword : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "MustChangePassword",
                table: "AspNetUsers",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MustChangePassword",
                table: "AspNetUsers");
        }
    }
}
