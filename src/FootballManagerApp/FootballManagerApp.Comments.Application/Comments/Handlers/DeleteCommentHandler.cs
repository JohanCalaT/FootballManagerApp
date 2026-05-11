using FootballManagerApp.Shared.Responses;

namespace FootballManagerApp.Comments.Application.Comments.Handlers;

public class DeleteCommentHandler
{
    // TODO Fase 2: inyectar ICommentRepository y ICacheService

    public Task<ApiResponse<object>> HandleAsync(
        Guid id,
        CancellationToken ct)
    {
        throw new NotImplementedException("Implementar en Fase 2");
    }
}
