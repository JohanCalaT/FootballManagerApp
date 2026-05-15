using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FootballManagerApp.Players.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class PlayerSoftDelete : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "Players",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Players_DeletedAt",
                table: "Players",
                column: "DeletedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Players_DeletedAt",
                table: "Players");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "Players");
        }
    }
}
