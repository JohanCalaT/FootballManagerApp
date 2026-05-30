using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FootballManagerApp.Players.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class PlayerVersionConcurrencyToken : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Version",
                table: "Players",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Version",
                table: "Players");
        }
    }
}
