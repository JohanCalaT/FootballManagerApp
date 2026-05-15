using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FootballManagerApp.Players.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class PlayerApiFootballIdIgnoreSoftDeleted : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Players_ApiFootballId",
                table: "Players");

            migrationBuilder.CreateIndex(
                name: "IX_Players_ApiFootballId",
                table: "Players",
                column: "ApiFootballId",
                unique: true,
                filter: "\"ApiFootballId\" IS NOT NULL AND \"DeletedAt\" IS NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Players_ApiFootballId",
                table: "Players");

            migrationBuilder.CreateIndex(
                name: "IX_Players_ApiFootballId",
                table: "Players",
                column: "ApiFootballId",
                unique: true,
                filter: "\"ApiFootballId\" IS NOT NULL");
        }
    }
}
