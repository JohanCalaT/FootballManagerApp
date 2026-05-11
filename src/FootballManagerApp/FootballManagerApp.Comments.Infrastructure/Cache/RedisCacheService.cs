using FootballManagerApp.Comments.Application.Common.Interfaces;
using Microsoft.Extensions.Caching.Distributed;

namespace FootballManagerApp.Comments.Infrastructure.Cache;

public class RedisCacheService : ICacheService
{
    private readonly IDistributedCache _cache;

    public RedisCacheService(IDistributedCache cache) => _cache = cache;

    public Task<T?> GetAsync<T>(string key, CancellationToken ct) =>
        throw new NotImplementedException("TODO Fase 2");

    public Task SetAsync<T>(string key, T value, TimeSpan ttl, CancellationToken ct) =>
        throw new NotImplementedException("TODO Fase 2");

    public Task RemoveAsync(string key, CancellationToken ct) =>
        throw new NotImplementedException("TODO Fase 2");
}
