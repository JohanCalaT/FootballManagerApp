using FootballManagerApp.Players.Application.Players.DTOs;
using FootballManagerApp.Shared.Responses;

namespace FootballManagerApp.Players.Application.Players.Handlers;

public class UpdatePlayerHandler
{
    // TODO Fase 2: inyectar IPlayerRepository y ICacheService

    public Task<ApiResponse<PlayerDetailDto>> HandleAsync(
        Guid id,
        UpdatePlayerDto dto,
        CancellationToken ct)
    {
        throw new NotImplementedException("Implementar en Fase 2");
    }
}
