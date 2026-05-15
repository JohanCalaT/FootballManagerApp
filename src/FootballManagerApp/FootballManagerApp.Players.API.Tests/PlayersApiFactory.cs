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
        // AddRedisDistributedCache también necesita una connection string.
        builder.UseSetting("ConnectionStrings:redis", "localhost:6379");
        // ApiFootballService lee ApiFootball:ApiKey al construir el HttpClient.
        builder.UseSetting("ApiFootball:ApiKey", "test-key-not-used");

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

            // API-Football tampoco se contacta — fake con respuestas vacías.
            services.RemoveAll<IApiFootballService>();
            services.AddScoped<IApiFootballService, FakeApiFootballService>();

            // ICacheService Redis fallaría sin un Redis real. Reemplazamos por noop.
            services.RemoveAll<ICacheService>();
            services.AddScoped<ICacheService, NoopCacheService>();

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

internal sealed class FakeApiFootballService : IApiFootballService
{
    public Task<ApiFootballSearchPage> SearchProfilesAsync(
        string query, int page, CancellationToken ct) =>
        Task.FromResult(new ApiFootballSearchPage(
            Items: Array.Empty<ApiFootballProfileSummary>(),
            Page: page, TotalPages: 1, TotalResults: 0));

    public Task<IReadOnlyList<int>> GetSeasonsAsync(int apiFootballId, CancellationToken ct) =>
        Task.FromResult<IReadOnlyList<int>>(Array.Empty<int>());

    public Task<ApiFootballImportData?> GetPlayerImportDataAsync(
        int apiFootballId, int season, CancellationToken ct) =>
        Task.FromResult<ApiFootballImportData?>(null);
}

internal sealed class NoopCacheService : ICacheService
{
    public Task<T?> GetAsync<T>(string key, CancellationToken ct) =>
        Task.FromResult<T?>(default);
    public Task SetAsync<T>(string key, T value, TimeSpan ttl, CancellationToken ct) =>
        Task.CompletedTask;
    public Task RemoveAsync(string key, CancellationToken ct) =>
        Task.CompletedTask;
}
