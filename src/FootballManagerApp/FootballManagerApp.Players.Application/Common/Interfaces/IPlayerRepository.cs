using FootballManagerApp.Players.Domain.Entities;

namespace FootballManagerApp.Players.Application.Common.Interfaces;

public interface IPlayerRepository
{
    Task<Player?> GetByIdAsync(Guid id, CancellationToken ct);

    Task<(IEnumerable<Player> Players, int Total)> GetAllAsync(
        int page, int limit, CancellationToken ct);

    Task<(IEnumerable<Player> Players, int Total)> SearchAsync(
        string? name,
        string? team,
        string? league,
        DateTime? from,
        DateTime? to,
        int page,
        int limit,
        CancellationToken ct);

    Task<Player> CreateAsync(Player player, CancellationToken ct);
    Task UpdateAsync(Player player, CancellationToken ct);
    Task DeleteAsync(Guid id, CancellationToken ct);

    Task<bool> ExistsAsync(int apiFootballId, int season, CancellationToken ct);
}
