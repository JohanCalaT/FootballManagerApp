using FootballManagerApp.Comments.Application.Common.Interfaces;
using FootballManagerApp.Shared.Responses;
using Microsoft.Extensions.Logging;

namespace FootballManagerApp.Comments.Application.Comments.Handlers;

public class DeleteCommentHandler
{
    private readonly ICommentRepository _repo;
    private readonly ILogger<DeleteCommentHandler> _logger;

    public DeleteCommentHandler(
        ICommentRepository repo,
        ILogger<DeleteCommentHandler> logger)
    {
        _repo = repo;
        _logger = logger;
    }

    public async Task<ApiResponse<object>> HandleAsync(Guid id, CancellationToken ct)
    {
        // Idempotente: DELETE devuelve 204 aunque el comentario ya no exista.
        await _repo.DeleteAsync(id, ct);
        _logger.LogInformation("Comment delete (idempotent) {CommentId}", id);
        return ApiResponse<object>.NoContent();
    }
}
