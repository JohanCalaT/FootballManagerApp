using FootballManagerApp.Players.Application.Players.DTOs;
using FootballManagerApp.Shared.Responses;

namespace FootballManagerApp.Players.Application.Players.Handlers;

public class GetPlayerByIdHandler
{
    // TODO Fase 2: inyectar IPlayerRepository, ICommentsClient, ICacheService

    public Task<ApiResponse<PlayerDetailDto>> HandleAsync(
        Guid id,
        CancellationToken ct)
    {
        throw new NotImplementedException("Implementar en Fase 2");
    }
}
