using FootballManagerApp.Comments.Application.Comments.DTOs;
using FootballManagerApp.Shared.Responses;

namespace FootballManagerApp.Comments.Application.Comments.Handlers;

public class CreateCommentHandler
{
    // TODO Fase 2: inyectar ICommentRepository y ICacheService

    public Task<ApiResponse<CommentDto>> HandleAsync(
        Guid playerId,
        CreateCommentDto dto,
        string? userId,
        CancellationToken ct)
    {
        throw new NotImplementedException("Implementar en Fase 2");
    }
}
