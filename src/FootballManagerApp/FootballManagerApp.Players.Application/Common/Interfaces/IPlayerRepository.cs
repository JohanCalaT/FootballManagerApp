using FootballManagerApp.Players.Application.IdealTeam.DTOs;
using FootballManagerApp.Players.Domain.Entities;

namespace FootballManagerApp.Players.Application.Common.Interfaces;

public interface IPlayerRepository
{
    // Proyección agregada para construir el prompt del equipo ideal.
    // Vive en el repositorio para que el handler no toque IQueryable.
    Task<IReadOnlyList<PlayerForPromptDto>> GetAllForIdealTeamAsync(
        CancellationToken ct);

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

    // Soft-uniqueness check: el mismo nombre + equipo (case-insensitive)
    // identifica probablemente al mismo jugador manual. Devuelve el id del
    // existente para que el cliente pueda redirigir o forzar.
    Task<Guid?> FindIdByNameAndTeamAsync(
        string name, string team, CancellationToken ct);
}
