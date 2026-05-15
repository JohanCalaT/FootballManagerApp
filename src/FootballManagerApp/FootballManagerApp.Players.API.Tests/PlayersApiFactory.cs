using FootballManagerApp.Players.Application.Common.DTOs;
using FootballManagerApp.Players.Application.Common.Interfaces;
using FootballManagerApp.Players.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace FootballManagerApp.Players.API.Tests;

public sealed class PlayersApiFactory : WebApplicationFactory<Program>
{
    private readonly SqliteConnection _connection;

    public PlayersApiFactory()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        // Aspire AddNpgsqlDbContext exige una ConnectionString al construir el
        // host; le damos un valor dummy y luego lo reemplazamos por SQLite.
        builder.UseSetting("ConnectionStrings:playersdb",
            "Host=localhost;Database=ignored;Username=t;Password=t");

        builder.ConfigureServices(services =>
        {
            // Aspire registró el provider Postgres + el DbContext pooled.
            // Limpiamos TODO lo relacionado con EF para evitar
            // "Only a single database provider can be registered".
            var efDescriptors = services
                .Where(d => d.ServiceType.FullName?.StartsWith(
                    "Microsoft.EntityFrameworkCore") == true
                         || d.ServiceType == typeof(PlayersDbContext)
                         || d.ServiceType == typeof(DbContextOptions<PlayersDbContext>)
                         || d.ServiceType == typeof(DbContextOptions))
                .ToList();
            foreach (var d in efDescriptors) services.Remove(d);

            services.AddDbContext<PlayersDbContext>(opts => opts.UseSqlite(_connection));

            // Comments.API no está disponible en tests → CommentsClient se simula.
            services.RemoveAll<ICommentsClient>();
            services.AddScoped<ICommentsClient, FakeCommentsClient>();

            using var scope = services.BuildServiceProvider().CreateScope();
            scope.ServiceProvider.GetRequiredService<PlayersDbContext>()
                 .Database.EnsureCreated();
        });
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing) _connection.Dispose();
        base.Dispose(disposing);
    }
}

internal sealed class FakeCommentsClient : ICommentsClient
{
    public Task<IEnumerable<CommentDto>> GetByPlayerIdAsync(Guid playerId, CancellationToken ct) =>
        Task.FromResult<IEnumerable<CommentDto>>(Array.Empty<CommentDto>());
    public Task<bool> DeleteAsync(Guid commentId, CancellationToken ct) =>
        Task.FromResult(true);
    public Task<bool> DeleteByPlayerIdAsync(Guid playerId, CancellationToken ct) =>
        Task.FromResult(true);
}
