using FootballManagerApp.Players.Application.Common.Interfaces;
using FootballManagerApp.Players.Application.Players.DTOs;
using FootballManagerApp.Players.Application.Players.Mapping;
using FootballManagerApp.Shared.Responses;
using Microsoft.Extensions.Logging;

namespace FootballManagerApp.Players.Application.Players.Handlers;

public class GetPlayerByIdHandler
{
    private readonly IPlayerRepository _repo;
    private readonly ICommentsClient _commentsClient;
    private readonly ILogger<GetPlayerByIdHandler> _logger;

    public GetPlayerByIdHandler(
        IPlayerRepository repo,
        ICommentsClient commentsClient,
        ILogger<GetPlayerByIdHandler> logger)
    {
        _repo = repo;
        _commentsClient = commentsClient;
        _logger = logger;
    }

    public async Task<ApiResponse<PlayerDetailDto>> HandleAsync(
        Guid id, CancellationToken ct)
    {
        var player = await _repo.GetByIdAsync(id, ct);
        if (player is null)
            return ApiResponse<PlayerDetailDto>.NotFound($"Jugador {id} no encontrado");

        // CommentsClient ya degrada a [] si el circuito está abierto.
        var comments = await _commentsClient.GetByPlayerIdAsync(id, ct);

        _logger.LogInformation(
            "Loaded player {PlayerId} with {CommentCount} comments",
            id, comments.Count());

        return ApiResponse<PlayerDetailDto>.Success(player.ToDetail(comments));
    }
}
