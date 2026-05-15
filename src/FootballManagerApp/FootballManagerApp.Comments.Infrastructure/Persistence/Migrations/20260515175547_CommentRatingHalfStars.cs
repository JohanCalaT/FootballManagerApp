using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FootballManagerApp.Comments.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class CommentRatingHalfStars : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Comments_Rating",
                table: "Comments");

            migrationBuilder.AlterColumn<decimal>(
                name: "Rating",
                table: "Comments",
                type: "numeric(2,1)",
                precision: 2,
                scale: 1,
                nullable: false,
                oldClrType: typeof(short),
                oldType: "smallint");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<short>(
                name: "Rating",
                table: "Comments",
                type: "smallint",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(2,1)",
                oldPrecision: 2,
                oldScale: 1);

            migrationBuilder.AddCheckConstraint(
                name: "CK_Comments_Rating",
                table: "Comments",
                sql: "\"Rating\" BETWEEN 0 AND 5");
        }
    }
}
