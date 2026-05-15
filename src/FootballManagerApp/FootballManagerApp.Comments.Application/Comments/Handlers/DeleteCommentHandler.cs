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
        var existing = await _repo.GetByIdAsync(id, ct);
        if (existing is null)
            return ApiResponse<object>.NotFound($"Comentario {id} no encontrado");

        await _repo.DeleteAsync(id, ct);

        _logger.LogInformation("Comment deleted {CommentId}", id);

        return ApiResponse<object>.NoContent();
    }
}
