using FootballManagerApp.Comments.Infrastructure.Persistence;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace FootballManagerApp.Comments.Infrastructure.Tests.Persistence;

public sealed class SqliteCommentsDbContextFactory : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly DbContextOptions<CommentsDbContext> _options;

    public SqliteCommentsDbContextFactory()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        _options = new DbContextOptionsBuilder<CommentsDbContext>()
            .UseSqlite(_connection)
            .Options;

        using var ctx = new CommentsDbContext(_options);
        ctx.Database.EnsureCreated();
    }

    public CommentsDbContext CreateContext() => new(_options);

    public void Dispose() => _connection.Dispose();
}
