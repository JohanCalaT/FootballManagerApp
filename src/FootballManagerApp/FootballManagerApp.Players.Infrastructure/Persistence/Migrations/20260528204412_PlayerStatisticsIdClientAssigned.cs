using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FootballManagerApp.Players.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class PlayerStatisticsIdClientAssigned : Migration
    {
        // Intencionadamente vacía. Solo sincroniza el snapshot del modelo con dos
        // cambios de metadatos SIN impacto en el esquema:
        //   1. PlayerStatistics.Id -> ValueGeneratedNever (el dominio asigna el PK
        //      en Create). Evita que EF marque las stats nuevas como Modified al
        //      reemplazar el array, lo que provocaba un DbUpdateConcurrencyException.
        //   2. La relación Player<->PlayerStatistics expone el back-reference
        //      navigation (s => s.Player).
        // La columna "Id" ya era uuid PK sin default en BD, así que no hay DDL.

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {

        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
