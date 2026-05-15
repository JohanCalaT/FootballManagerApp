using FootballManagerApp.Comments.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FootballManagerApp.Comments.Infrastructure.Persistence.Configurations;

public class CommentConfiguration : IEntityTypeConfiguration<Comment>
{
    public void Configure(EntityTypeBuilder<Comment> builder)
    {
        builder.ToTable("Comments", b => b.HasCheckConstraint("CK_Comments_Rating", "\"Rating\" BETWEEN 0 AND 5"));
        builder.HasKey(c => c.Id);

        builder.Property(c => c.PlayerId).IsRequired();
        builder.Property(c => c.Author).IsRequired().HasMaxLength(100);
        builder.Property(c => c.Text).IsRequired().HasMaxLength(1000);
        builder.Property(c => c.Rating).IsRequired().HasColumnType("smallint");
        builder.Property(c => c.CreatedAt).IsRequired();
        builder.Property(c => c.CreatedByUserId).HasMaxLength(100);

        builder.OwnsOne(c => c.ClientGeolocation, geo =>
        {
            geo.Property(g => g.Lat).HasColumnName("ClientLat").HasPrecision(10, 8);
            geo.Property(g => g.Lng).HasColumnName("ClientLng").HasPrecision(11, 8);
            geo.Property(g => g.City).HasColumnName("ClientCity").HasMaxLength(100);
            geo.Property(g => g.Country).HasColumnName("ClientCountry").HasMaxLength(100);
        });

        builder.HasIndex(c => c.PlayerId);
        builder.HasIndex(c => c.CreatedAt);
    }
}
