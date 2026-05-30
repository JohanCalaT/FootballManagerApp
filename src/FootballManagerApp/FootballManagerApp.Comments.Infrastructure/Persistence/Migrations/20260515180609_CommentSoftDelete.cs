using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FootballManagerApp.Comments.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class CommentSoftDelete : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "Comments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Comments_DeletedAt",
                table: "Comments",
                column: "DeletedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Comments_DeletedAt",
                table: "Comments");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "Comments");
        }
    }
}
