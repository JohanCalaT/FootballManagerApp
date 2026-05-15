using FootballManagerApp.Players.Application.Common.Interfaces;
using FootballManagerApp.Players.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace FootballManagerApp.Players.Infrastructure.Persistence.Repositories;

public class PlayerStatisticsRepository : IPlayerStatisticsRepository
{
    private readonly PlayersDbContext _db;

    public PlayerStatisticsRepository(PlayersDbContext db) => _db = db;

    public async Task<IEnumerable<PlayerStatistics>> GetByPlayerIdAsync(
        Guid playerId, CancellationToken ct) =>
        await _db.PlayerStatistics
            .AsNoTracking()
            .Where(s => s.PlayerId == playerId)
            .OrderByDescending(s => s.Season)
            .ToListAsync(ct);

    public async Task AddRangeAsync(
        IEnumerable<PlayerStatistics> stats, CancellationToken ct)
    {
        await _db.PlayerStatistics.AddRangeAsync(stats, ct);
        await _db.SaveChangesAsync(ct);
    }
}
