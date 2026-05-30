using FootballManagerApp.Players.Application.Common.Interfaces;
using FootballManagerApp.Shared.Responses;
using Microsoft.Extensions.Logging;

namespace FootballManagerApp.Players.Application.Players.Handlers;

public class DeletePlayerHandler
{
    private readonly IPlayerRepository _repo;
    private readonly ICommentsClient _commentsClient;
    private readonly ILogger<DeletePlayerHandler> _logger;

    public DeletePlayerHandler(
        IPlayerRepository repo,
        ICommentsClient commentsClient,
        ILogger<DeletePlayerHandler> logger)
    {
        _repo = repo;
        _commentsClient = commentsClient;
        _logger = logger;
    }

    public async Task<ApiResponse<object>> HandleAsync(Guid id, CancellationToken ct)
    {
        // Idempotente: REST recomienda 204 incluso si el recurso no existe.
        await _repo.DeleteAsync(id, ct);

        var cascaded = await _commentsClient.DeleteByPlayerIdAsync(id, ct);
        if (!cascaded)
            _logger.LogWarning(
                "Player {PlayerId} delete cascade to Comments failed (down?)", id);

        _logger.LogInformation("Player delete (idempotent) {PlayerId}", id);

        return ApiResponse<object>.NoContent();
    }
}
