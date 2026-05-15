using System.Text.Json;
using FootballManagerApp.Players.Application.Common.Interfaces;

namespace FootballManagerApp.Players.Infrastructure.Tests.ExternalServices.ApiFootball;

// Cache fake para tests — emula ICacheService sin Redis.
// Mantiene serialización JSON para detectar problemas de tipo igual que en prod.
internal sealed class InMemoryCacheService : ICacheService
{
    private static readonly JsonSerializerOptions JsonOptions =
        new(JsonSerializerDefaults.Web);

    private readonly Dictionary<string, string> _store = new();

    public int HitCount { get; private set; }
    public int MissCount { get; private set; }

    public Task<T?> GetAsync<T>(string key, CancellationToken ct)
    {
        if (_store.TryGetValue(key, out var json))
        {
            HitCount++;
            return Task.FromResult(JsonSerializer.Deserialize<T>(json, JsonOptions));
        }
        MissCount++;
        return Task.FromResult<T?>(default);
    }

    public Task SetAsync<T>(string key, T value, TimeSpan ttl, CancellationToken ct)
    {
        _store[key] = JsonSerializer.Serialize(value, JsonOptions);
        return Task.CompletedTask;
    }

    public Task RemoveAsync(string key, CancellationToken ct)
    {
        _store.Remove(key);
        return Task.CompletedTask;
    }
}
