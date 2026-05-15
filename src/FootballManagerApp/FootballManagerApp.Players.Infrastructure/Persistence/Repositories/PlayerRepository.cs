using FootballManagerApp.Players.Application.Common.Interfaces;
using FootballManagerApp.Players.Domain.Entities;
using FootballManagerApp.Shared.Exceptions;
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
        {
            var pattern = $"%{EscapeLikePattern(name)}%";
            query = query.Where(p => EF.Functions.ILike(p.Name, pattern, "\\"));
        }
        if (!string.IsNullOrWhiteSpace(team))
        {
            var pattern = $"%{EscapeLikePattern(team)}%";
            query = query.Where(p => EF.Functions.ILike(p.Team, pattern, "\\"));
        }
        if (!string.IsNullOrWhiteSpace(league))
        {
            var pattern = $"%{EscapeLikePattern(league)}%";
            query = query.Where(p => EF.Functions.ILike(p.League, pattern, "\\"));
        }
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
        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new ConcurrencyConflictException(
                $"Player {player.Id} was modified by another process");
        }
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct)
    {
        // Soft-delete: marca DeletedAt y persiste. HasQueryFilter oculta la fila
        // del resto de queries; queda accesible vía IgnoreQueryFilters() para
        // auditoría / undo en el futuro.
        var entity = await _db.Players.FindAsync([id], ct);
        if (entity is null) return;
        entity.MarkDeleted();
        await _db.SaveChangesAsync(ct);
    }

    public Task<bool> ExistsAsync(int apiFootballId, int season, CancellationToken ct) =>
        _db.Players
            .AsNoTracking()
            .Where(p => p.ApiFootballId == apiFootballId)
            .AnyAsync(p => p.Statistics.Any(s => s.Season == season), ct);

    // Escapes %, _ and the escape char itself so user input doesn't break out of
    // the LIKE pattern (e.g. searching "50%" must match the literal "50%").
    private static string EscapeLikePattern(string input) =>
        input.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_");

    public async Task<Guid?> FindIdByNameAndTeamAsync(
        string name, string team, CancellationToken ct)
    {
        var n = name.Trim().ToLower();
        var t = team.Trim().ToLower();
        return await _db.Players
            .AsNoTracking()
            .Where(p => p.Name.ToLower() == n && p.Team.ToLower() == t)
            .Select(p => (Guid?)p.Id)
            .FirstOrDefaultAsync(ct);
    }
}
