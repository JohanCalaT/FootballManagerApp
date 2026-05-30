using FootballManagerApp.Players.Application.Common.Interfaces;
using FootballManagerApp.Players.Application.Players.DTOs;
using FootballManagerApp.Players.Application.Players.Mapping;
using FootballManagerApp.Shared.Responses;
using Microsoft.Extensions.Logging;

namespace FootballManagerApp.Players.Application.Players.Handlers;

public class GetAllPlayersHandler
{
    private readonly IPlayerRepository _repo;
    private readonly ILogger<GetAllPlayersHandler> _logger;

    public GetAllPlayersHandler(
        IPlayerRepository repo,
        ILogger<GetAllPlayersHandler> logger)
    {
        _repo = repo;
        _logger = logger;
    }

    public async Task<PagedResponse<PlayerListItemDto>> HandleAsync(
        int page, int limit, CancellationToken ct)
    {
        if (page < 1) page = 1;
        if (limit < 1) limit = 10;
        if (limit > 100) limit = 100;

        var (players, total) = await _repo.GetAllAsync(page, limit, ct);
        var data = players.Select(p => p.ToListItem()).ToList();

        _logger.LogInformation(
            "Listed players page={Page} limit={Limit} total={Total}",
            page, limit, total);

        return PagedResponse<PlayerListItemDto>.Success(data, page, limit, total);
    }
}
