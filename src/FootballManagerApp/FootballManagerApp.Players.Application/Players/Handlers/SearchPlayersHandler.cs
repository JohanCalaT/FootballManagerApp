using FootballManagerApp.Players.Application.Players.DTOs;
using FootballManagerApp.Shared.Responses;

namespace FootballManagerApp.Players.Application.Players.Handlers;

public class SearchPlayersHandler
{
    // TODO Fase 2: inyectar IPlayerRepository y ICacheService

    public Task<PagedResponse<PlayerListItemDto>> HandleAsync(
        string? name,
        string? team,
        string? league,
        DateTime? from,
        DateTime? to,
        int page,
        int limit,
        CancellationToken ct)
    {
        throw new NotImplementedException("Implementar en Fase 2");
    }
}
