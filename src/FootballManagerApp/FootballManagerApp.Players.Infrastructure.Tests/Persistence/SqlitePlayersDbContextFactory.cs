using FootballManagerApp.Players.Infrastructure.Persistence;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace FootballManagerApp.Players.Infrastructure.Tests.Persistence;

// Each fixture owns one open SqliteConnection; closing it drops the in-memory DB.
public sealed class SqlitePlayersDbContextFactory : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly DbContextOptions<PlayersDbContext> _options;

    public SqlitePlayersDbContextFactory()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        _options = new DbContextOptionsBuilder<PlayersDbContext>()
            .UseSqlite(_connection)
            .Options;

        using var ctx = new PlayersDbContext(_options);
        ctx.Database.EnsureCreated();
    }

    public PlayersDbContext CreateContext() => new(_options);

    public void Dispose() => _connection.Dispose();
}
