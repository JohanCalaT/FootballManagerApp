using FootballManagerApp.Players.Domain.Entities;

namespace FootballManagerApp.Players.Application.Common.Interfaces;

public interface IPlayerStatisticsRepository
{
    Task<IEnumerable<PlayerStatistics>> GetByPlayerIdAsync(
        Guid playerId, CancellationToken ct);

    Task AddRangeAsync(
        IEnumerable<PlayerStatistics> stats, CancellationToken ct);
}
