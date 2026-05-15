using FootballManagerApp.Comments.Application.Common.Interfaces;
using FootballManagerApp.Shared.Responses;
using Microsoft.Extensions.Logging;

namespace FootballManagerApp.Comments.Application.Comments.Handlers;

public class DeleteCommentsByPlayerHandler
{
    private readonly ICommentRepository _repo;
    private readonly ILogger<DeleteCommentsByPlayerHandler> _logger;

    public DeleteCommentsByPlayerHandler(
        ICommentRepository repo,
        ILogger<DeleteCommentsByPlayerHandler> logger)
    {
        _repo = repo;
        _logger = logger;
    }

    public async Task<ApiResponse<object>> HandleAsync(Guid playerId, CancellationToken ct)
    {
        var deleted = await _repo.DeleteByPlayerIdAsync(playerId, ct);
        _logger.LogInformation(
            "Cascade-deleted {Count} comments for player {PlayerId}", deleted, playerId);
        return ApiResponse<object>.NoContent();
    }
}
