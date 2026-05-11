using FootballManagerApp.Shared.Responses;

namespace FootballManagerApp.Players.Application.Players.Handlers;

public class DeletePlayerHandler
{
    // TODO Fase 2: inyectar IPlayerRepository, ICommentsClient, ICacheService

    public Task<ApiResponse<object>> HandleAsync(
        Guid id,
        CancellationToken ct)
    {
        throw new NotImplementedException("Implementar en Fase 2");
    }
}
