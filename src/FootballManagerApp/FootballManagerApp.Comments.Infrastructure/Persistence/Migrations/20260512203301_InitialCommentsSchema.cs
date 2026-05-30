using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FootballManagerApp.Comments.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCommentsSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Comments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PlayerId = table.Column<Guid>(type: "uuid", nullable: false),
                    Author = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Text = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    Rating = table.Column<short>(type: "smallint", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ClientLat = table.Column<decimal>(type: "numeric(10,8)", precision: 10, scale: 8, nullable: true),
                    ClientLng = table.Column<decimal>(type: "numeric(11,8)", precision: 11, scale: 8, nullable: true),
                    ClientCity = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ClientCountry = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Comments", x => x.Id);
                    table.CheckConstraint("CK_Comments_Rating", "\"Rating\" BETWEEN 0 AND 5");
                });

            migrationBuilder.CreateIndex(
                name: "IX_Comments_CreatedAt",
                table: "Comments",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Comments_PlayerId",
                table: "Comments",
                column: "PlayerId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Comments");
        }
    }
}
