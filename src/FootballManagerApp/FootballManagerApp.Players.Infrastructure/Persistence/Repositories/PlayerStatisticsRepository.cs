using FootballManagerApp.Players.Application.Common.Interfaces;
using FootballManagerApp.Players.Domain.Entities;

namespace FootballManagerApp.Players.Infrastructure.Persistence.Repositories;

public class PlayerStatisticsRepository : IPlayerStatisticsRepository
{
    private readonly PlayersDbContext _db;

    public PlayerStatisticsRepository(PlayersDbContext db) => _db = db;

    public Task<IEnumerable<PlayerStatistics>> GetByPlayerIdAsync(
        Guid playerId, CancellationToken ct) =>
        throw new NotImplementedException("TODO Fase 2");

    public Task AddRangeAsync(
        IEnumerable<PlayerStatistics> stats, CancellationToken ct) =>
        throw new NotImplementedException("TODO Fase 2");
}
