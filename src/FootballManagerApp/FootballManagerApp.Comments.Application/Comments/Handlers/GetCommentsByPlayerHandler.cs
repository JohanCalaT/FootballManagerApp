using FootballManagerApp.Comments.Application.Comments.DTOs;
using FootballManagerApp.Comments.Application.Comments.Mapping;
using FootballManagerApp.Comments.Application.Common.Interfaces;
using FootballManagerApp.Shared.Responses;
using Microsoft.Extensions.Logging;

namespace FootballManagerApp.Comments.Application.Comments.Handlers;

public class GetCommentsByPlayerHandler
{
    private readonly ICommentRepository _repo;
    private readonly ILogger<GetCommentsByPlayerHandler> _logger;

    public GetCommentsByPlayerHandler(
        ICommentRepository repo,
        ILogger<GetCommentsByPlayerHandler> logger)
    {
        _repo = repo;
        _logger = logger;
    }

    public async Task<ApiResponse<IEnumerable<CommentDto>>> HandleAsync(
        Guid playerId, CancellationToken ct)
    {
        var comments = await _repo.GetByPlayerIdAsync(playerId, ct);
        var dtos = comments.Select(c => c.ToDto()).ToList();

        _logger.LogInformation(
            "Loaded {Count} comments for player {PlayerId}", dtos.Count, playerId);

        return ApiResponse<IEnumerable<CommentDto>>.Success(dtos);
    }
}
