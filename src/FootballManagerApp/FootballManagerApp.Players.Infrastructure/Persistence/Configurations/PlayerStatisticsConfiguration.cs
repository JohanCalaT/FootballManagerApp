using FootballManagerApp.Players.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FootballManagerApp.Players.Infrastructure.Persistence.Configurations;

public class PlayerStatisticsConfiguration : IEntityTypeConfiguration<PlayerStatistics>
{
    public void Configure(EntityTypeBuilder<PlayerStatistics> builder)
    {
        builder.ToTable("PlayerStatistics");
        builder.HasKey(s => s.Id);

        // El dominio asigna el PK en PlayerStatistics.Create (Guid.NewGuid).
        // Sin esto el PK queda como ValueGeneratedOnAdd y EF aplica su heurística
        // "key asignada => la fila ya existe": al reemplazar el array de stats
        // (Clear + Add con GUIDs nuevos) marca las nuevas filas como Modified en
        // vez de Added y emite UPDATE en vez de INSERT → afecta 0 filas →
        // DbUpdateConcurrencyException espuria. ValueGeneratedNever le dice a EF
        // que la app controla el Id, así las entidades nuevas se detectan Added.
        builder.Property(s => s.Id).ValueGeneratedNever();

        builder.Property(s => s.PlayerId).IsRequired();
        builder.Property(s => s.Season).IsRequired();

        builder.Property(s => s.LeagueName).HasMaxLength(100);
        builder.Property(s => s.LeagueCountry).HasMaxLength(100);
        builder.Property(s => s.LeagueLogo).HasMaxLength(500);
        builder.Property(s => s.TeamName).HasMaxLength(100);
        builder.Property(s => s.TeamLogo).HasMaxLength(500);

        builder.Property(s => s.Position).HasMaxLength(50);
        builder.Property(s => s.Rating).HasPrecision(6, 4);

        builder.HasIndex(s => new { s.PlayerId, s.Season, s.LeagueId, s.TeamId })
            .IsUnique();
    }
}
