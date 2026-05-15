using FootballManagerApp.Players.Application.Common.Interfaces;
using FootballManagerApp.Players.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace FootballManagerApp.Players.Infrastructure.Persistence.Repositories;

public class PlayerRepository : IPlayerRepository
{
    private readonly PlayersDbContext _db;

    public PlayerRepository(PlayersDbContext db) => _db = db;

    public Task<Player?> GetByIdAsync(Guid id, CancellationToken ct) =>
        _db.Players
            .Include(p => p.Statistics)
            .FirstOrDefaultAsync(p => p.Id == id, ct);

    public async Task<(IEnumerable<Player> Players, int Total)> GetAllAsync(
        int page, int limit, CancellationToken ct)
    {
        var query = _db.Players.AsNoTracking().OrderByDescending(p => p.RegisteredAt);
        var total = await query.CountAsync(ct);
        var items = await query
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync(ct);
        return (items, total);
    }

    public async Task<(IEnumerable<Player> Players, int Total)> SearchAsync(
        string? name,
        string? team,
        string? league,
        DateTime? from,
        DateTime? to,
        int page,
        int limit,
        CancellationToken ct)
    {
        var query = _db.Players.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(name))
            query = query.Where(p => EF.Functions.ILike(p.Name, $"%{name}%"));
        if (!string.IsNullOrWhiteSpace(team))
            query = query.Where(p => EF.Functions.ILike(p.Team, $"%{team}%"));
        if (!string.IsNullOrWhiteSpace(league))
            query = query.Where(p => EF.Functions.ILike(p.League, $"%{league}%"));
        if (from.HasValue)
            query = query.Where(p => p.RegisteredAt >= from.Value);
        if (to.HasValue)
            query = query.Where(p => p.RegisteredAt <= to.Value);

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(p => p.RegisteredAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync(ct);
        return (items, total);
    }

    public async Task<Player> CreateAsync(Player player, CancellationToken ct)
    {
        await _db.Players.AddAsync(player, ct);
        await _db.SaveChangesAsync(ct);
        return player;
    }

    public async Task UpdateAsync(Player player, CancellationToken ct)
    {
        _db.Players.Update(player);
        await _db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct)
    {
        var entity = await _db.Players.FindAsync([id], ct);
        if (entity is null) return;
        _db.Players.Remove(entity);
        await _db.SaveChangesAsync(ct);
    }

    public Task<bool> ExistsAsync(int apiFootballId, int season, CancellationToken ct) =>
        _db.Players
            .AsNoTracking()
            .Where(p => p.ApiFootballId == apiFootballId)
            .AnyAsync(p => p.Statistics.Any(s => s.Season == season), ct);
}
