using FootballManagerApp.Comments.Application.Comments.DTOs;
using FootballManagerApp.Shared.Responses;

namespace FootballManagerApp.Comments.Application.Comments.Handlers;

public class GetCommentsByPlayerHandler
{
    // TODO Fase 2: inyectar ICommentRepository y ICacheService

    public Task<ApiResponse<IEnumerable<CommentDto>>> HandleAsync(
        Guid playerId,
        CancellationToken ct)
    {
        throw new NotImplementedException("Implementar en Fase 2");
    }
}
