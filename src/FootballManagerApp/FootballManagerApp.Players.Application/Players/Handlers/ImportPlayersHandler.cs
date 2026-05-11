using FootballManagerApp.Players.Application.Players.DTOs;
using FootballManagerApp.Shared.Responses;

namespace FootballManagerApp.Players.Application.Players.Handlers;

public class ImportPlayersHandler
{
    // TODO Fase 2: inyectar IApiFootballService, IPlayerRepository, ICacheService

    public Task<ApiResponse<IEnumerable<PlayerListItemDto>>> HandleAsync(
        IEnumerable<ImportPlayerItemDto> items,
        string userId,
        decimal? clientLat,
        decimal? clientLng,
        string? clientCity,
        string? clientCountry,
        CancellationToken ct)
    {
        throw new NotImplementedException("Implementar en Fase 2");
    }
}
