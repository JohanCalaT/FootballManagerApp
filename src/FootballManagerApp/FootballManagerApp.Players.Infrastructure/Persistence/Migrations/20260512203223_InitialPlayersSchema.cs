using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FootballManagerApp.Players.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialPlayersSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Players",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ApiFootballId = table.Column<int>(type: "integer", nullable: true),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    FirstName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    LastName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Nationality = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    BirthDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    BirthPlace = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    BirthCountry = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Height = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Weight = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Injured = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    Team = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    League = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Position = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    ShirtNumber = table.Column<int>(type: "integer", nullable: true),
                    ImageUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ImageSource = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    RegisteredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ClientLat = table.Column<decimal>(type: "numeric(10,8)", precision: 10, scale: 8, nullable: true),
                    ClientLng = table.Column<decimal>(type: "numeric(11,8)", precision: 11, scale: 8, nullable: true),
                    ClientCity = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ClientCountry = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    PlayerLat = table.Column<decimal>(type: "numeric(10,8)", precision: 10, scale: 8, nullable: true),
                    PlayerLng = table.Column<decimal>(type: "numeric(11,8)", precision: 11, scale: 8, nullable: true),
                    PlayerCity = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    PlayerCountry = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Players", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PlayerStatistics",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PlayerId = table.Column<Guid>(type: "uuid", nullable: false),
                    Season = table.Column<int>(type: "integer", nullable: false),
                    LeagueId = table.Column<int>(type: "integer", nullable: true),
                    LeagueName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    LeagueCountry = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    LeagueLogo = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    TeamId = table.Column<int>(type: "integer", nullable: true),
                    TeamName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    TeamLogo = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Appearances = table.Column<int>(type: "integer", nullable: false),
                    Lineups = table.Column<int>(type: "integer", nullable: false),
                    MinutesPlayed = table.Column<int>(type: "integer", nullable: false),
                    Position = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Rating = table.Column<decimal>(type: "numeric(6,4)", precision: 6, scale: 4, nullable: true),
                    Captain = table.Column<bool>(type: "boolean", nullable: false),
                    SubstitutesIn = table.Column<int>(type: "integer", nullable: false),
                    SubstitutesOut = table.Column<int>(type: "integer", nullable: false),
                    SubstitutesBench = table.Column<int>(type: "integer", nullable: false),
                    ShotsTotal = table.Column<int>(type: "integer", nullable: false),
                    ShotsOnTarget = table.Column<int>(type: "integer", nullable: false),
                    Goals = table.Column<int>(type: "integer", nullable: false),
                    GoalsConceded = table.Column<int>(type: "integer", nullable: false),
                    Assists = table.Column<int>(type: "integer", nullable: false),
                    GoalsSaved = table.Column<int>(type: "integer", nullable: false),
                    PassesTotal = table.Column<int>(type: "integer", nullable: false),
                    PassesKey = table.Column<int>(type: "integer", nullable: false),
                    PassesAccuracy = table.Column<int>(type: "integer", nullable: false),
                    TacklesTotal = table.Column<int>(type: "integer", nullable: false),
                    TacklesBlocks = table.Column<int>(type: "integer", nullable: false),
                    Interceptions = table.Column<int>(type: "integer", nullable: false),
                    DuelsTotal = table.Column<int>(type: "integer", nullable: false),
                    DuelsWon = table.Column<int>(type: "integer", nullable: false),
                    DribblesAttempts = table.Column<int>(type: "integer", nullable: false),
                    DribblesSuccess = table.Column<int>(type: "integer", nullable: false),
                    FoulsDrawn = table.Column<int>(type: "integer", nullable: false),
                    FoulsCommitted = table.Column<int>(type: "integer", nullable: false),
                    YellowCards = table.Column<int>(type: "integer", nullable: false),
                    YellowRedCards = table.Column<int>(type: "integer", nullable: false),
                    RedCards = table.Column<int>(type: "integer", nullable: false),
                    PenaltyScored = table.Column<int>(type: "integer", nullable: false),
                    PenaltyMissed = table.Column<int>(type: "integer", nullable: false),
                    PenaltySaved = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlayerStatistics", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PlayerStatistics_Players_PlayerId",
                        column: x => x.PlayerId,
                        principalTable: "Players",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Players_ApiFootballId",
                table: "Players",
                column: "ApiFootballId",
                unique: true,
                filter: "\"ApiFootballId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_PlayerStatistics_PlayerId_Season_LeagueId_TeamId",
                table: "PlayerStatistics",
                columns: new[] { "PlayerId", "Season", "LeagueId", "TeamId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PlayerStatistics");

            migrationBuilder.DropTable(
                name: "Players");
        }
    }
}
