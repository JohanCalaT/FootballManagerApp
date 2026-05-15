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
