using FootballManagerApp.Players.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FootballManagerApp.Players.Infrastructure.Persistence.Configurations;

public class PlayerConfiguration : IEntityTypeConfiguration<Player>
{
    public void Configure(EntityTypeBuilder<Player> builder)
    {
        builder.ToTable("Players");
        builder.HasKey(p => p.Id);

        builder.Property(p => p.ApiFootballId);
        // Unique entre jugadores ACTIVOS — los soft-deleted (DeletedAt != null)
        // no participan, así puedes re-importar el mismo apiFootballId tras borrar.
        builder.HasIndex(p => p.ApiFootballId)
            .IsUnique()
            .HasFilter("\"ApiFootballId\" IS NOT NULL AND \"DeletedAt\" IS NULL");

        builder.Property(p => p.Name).IsRequired().HasMaxLength(100);
        builder.Property(p => p.FirstName).HasMaxLength(100);
        builder.Property(p => p.LastName).HasMaxLength(100);
        builder.Property(p => p.Nationality).HasMaxLength(100);
        builder.Property(p => p.BirthDate);
        builder.Property(p => p.BirthPlace).HasMaxLength(100);
        builder.Property(p => p.BirthCountry).HasMaxLength(100);
        builder.Property(p => p.Height).HasMaxLength(20);
        builder.Property(p => p.Weight).HasMaxLength(20);
        builder.Property(p => p.Injured).HasDefaultValue(false);

        builder.Property(p => p.Team).IsRequired().HasMaxLength(100);
        builder.Property(p => p.League).IsRequired().HasMaxLength(100);
        builder.Property(p => p.Position).HasMaxLength(50);
        builder.Property(p => p.ShirtNumber);

        builder.Property(p => p.ImageUrl).HasMaxLength(500);
        builder.Property(p => p.ImageSource).HasMaxLength(10);

        builder.Property(p => p.RegisteredAt).IsRequired();
        builder.Property(p => p.CreatedByUserId).IsRequired().HasMaxLength(100);

        builder.Property(p => p.Version)
            .IsConcurrencyToken();

        builder.Property(p => p.DeletedAt);
        builder.HasIndex(p => p.DeletedAt);
        builder.HasQueryFilter(p => p.DeletedAt == null);

        builder.OwnsOne(p => p.ClientGeolocation, geo =>
        {
            geo.Property(g => g.Lat).HasColumnName("ClientLat").HasPrecision(10, 8);
            geo.Property(g => g.Lng).HasColumnName("ClientLng").HasPrecision(11, 8);
            geo.Property(g => g.City).HasColumnName("ClientCity").HasMaxLength(100);
            geo.Property(g => g.Country).HasColumnName("ClientCountry").HasMaxLength(100);
        });

        builder.OwnsOne(p => p.PlayerGeolocation, geo =>
        {
            geo.Property(g => g.Lat).HasColumnName("PlayerLat").HasPrecision(10, 8);
            geo.Property(g => g.Lng).HasColumnName("PlayerLng").HasPrecision(11, 8);
            geo.Property(g => g.City).HasColumnName("PlayerCity").HasMaxLength(100);
            geo.Property(g => g.Country).HasColumnName("PlayerCountry").HasMaxLength(100);
        });

        builder.HasMany(p => p.Statistics)
            .WithOne()
            .HasForeignKey(s => s.PlayerId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Metadata
            .FindNavigation(nameof(Player.Statistics))!
            .SetPropertyAccessMode(PropertyAccessMode.Field);
    }
}
