using FootballManagerApp.Players.Application.Common.Interfaces;
using FootballManagerApp.Players.Domain.Entities;

namespace FootballManagerApp.Players.Infrastructure.Persistence.Repositories;

public class PlayerRepository : IPlayerRepository
{
    private readonly PlayersDbContext _db;

    public PlayerRepository(PlayersDbContext db) => _db = db;

    public Task<Player?> GetByIdAsync(Guid id, CancellationToken ct) =>
        throw new NotImplementedException("TODO Fase 2");

    public Task<(IEnumerable<Player> Players, int Total)> GetAllAsync(
        int page, int limit, CancellationToken ct) =>
        throw new NotImplementedException("TODO Fase 2");

    public Task<(IEnumerable<Player> Players, int Total)> SearchAsync(
        string? name,
        string? team,
        string? league,
        DateTime? from,
        DateTime? to,
        int page,
        int limit,
        CancellationToken ct) =>
        throw new NotImplementedException("TODO Fase 2");

    public Task<Player> CreateAsync(Player player, CancellationToken ct) =>
        throw new NotImplementedException("TODO Fase 2");

    public Task UpdateAsync(Player player, CancellationToken ct) =>
        throw new NotImplementedException("TODO Fase 2");

    public Task DeleteAsync(Guid id, CancellationToken ct) =>
        throw new NotImplementedException("TODO Fase 2");

    public Task<bool> ExistsAsync(int apiFootballId, int season, CancellationToken ct) =>
        throw new NotImplementedException("TODO Fase 2");
}
