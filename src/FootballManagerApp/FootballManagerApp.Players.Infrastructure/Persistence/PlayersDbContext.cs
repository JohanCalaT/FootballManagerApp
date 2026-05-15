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
}
