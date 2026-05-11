using FootballManagerApp.Players.Application.Players.DTOs;
using FootballManagerApp.Shared.Responses;

namespace FootballManagerApp.Players.Application.Players.Handlers;

public class CreatePlayerHandler
{
    // TODO Fase 2: inyectar IPlayerRepository, IBlobStorageService, ICacheService

    public Task<ApiResponse<PlayerDetailDto>> HandleAsync(
        CreatePlayerDto dto,
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
