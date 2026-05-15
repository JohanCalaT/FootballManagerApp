using FootballManagerApp.Players.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace FootballManagerApp.Players.Infrastructure.Persistence;

public class PlayersDbContext : DbContext
{
    public PlayersDbContext(DbContextOptions<PlayersDbContext> options)
        : base(options) { }

    public DbSet<Player> Players => Set<Player>();
    public DbSet<PlayerStatistics> PlayerStatistics => Set<PlayerStatistics>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(PlayersDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        BumpModifiedPlayerVersions();
        return base.SaveChangesAsync(cancellationToken);
    }

    public override int SaveChanges()
    {
        BumpModifiedPlayerVersions();
        return base.SaveChanges();
    }

    // EF.IsConcurrencyToken usa el valor ORIGINAL para WHERE y persiste el
    // valor CURRENT como nuevo. Aquí mutamos el current → +1 en Modified.
    private void BumpModifiedPlayerVersions()
    {
        foreach (var entry in ChangeTracker.Entries<Player>())
        {
            if (entry.State == EntityState.Modified)
            {
                var currentVersion = entry.Property(nameof(Player.Version)).CurrentValue is int v ? v : 0;
                entry.Property(nameof(Player.Version)).CurrentValue = currentVersion + 1;
            }
        }
    }
}
