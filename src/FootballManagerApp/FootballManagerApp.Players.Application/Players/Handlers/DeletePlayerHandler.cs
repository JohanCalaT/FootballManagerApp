using FootballManagerApp.Players.Application.Common.Interfaces;
using FootballManagerApp.Shared.Responses;
using Microsoft.Extensions.Logging;

namespace FootballManagerApp.Players.Application.Players.Handlers;

public class DeletePlayerHandler
{
    private readonly IPlayerRepository _repo;
    private readonly ILogger<DeletePlayerHandler> _logger;

    public DeletePlayerHandler(
        IPlayerRepository repo,
        ILogger<DeletePlayerHandler> logger)
    {
        _repo = repo;
        _logger = logger;
    }

    public async Task<ApiResponse<object>> HandleAsync(Guid id, CancellationToken ct)
    {
        var existing = await _repo.GetByIdAsync(id, ct);
        if (existing is null)
            return ApiResponse<object>.NotFound($"Jugador {id} no encontrado");

        await _repo.DeleteAsync(id, ct);

        _logger.LogInformation("Player deleted {PlayerId}", id);

        return ApiResponse<object>.NoContent();
    }
}
