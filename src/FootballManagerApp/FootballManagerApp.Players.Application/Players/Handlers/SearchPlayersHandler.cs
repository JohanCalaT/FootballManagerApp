using FootballManagerApp.Players.Application.Common.Interfaces;
using FootballManagerApp.Players.Application.Players.DTOs;
using FootballManagerApp.Players.Application.Players.Mapping;
using FootballManagerApp.Shared.Responses;
using Microsoft.Extensions.Logging;

namespace FootballManagerApp.Players.Application.Players.Handlers;

public class SearchPlayersHandler
{
    private readonly IPlayerRepository _repo;
    private readonly ILogger<SearchPlayersHandler> _logger;

    public SearchPlayersHandler(
        IPlayerRepository repo,
        ILogger<SearchPlayersHandler> logger)
    {
        _repo = repo;
        _logger = logger;
    }

    public async Task<PagedResponse<PlayerListItemDto>> HandleAsync(
        string? name,
        string? team,
        string? league,
        DateTime? from,
        DateTime? to,
        int page,
        int limit,
        CancellationToken ct)
    {
        if (page < 1) page = 1;
        if (limit < 1) limit = 10;
        if (limit > 100) limit = 100;

        var (players, total) = await _repo.SearchAsync(
            name, team, league, from, to, page, limit, ct);

        var data = players.Select(p => p.ToListItem()).ToList();

        _logger.LogInformation(
            "Search players name={Name} team={Team} league={League} found {Total}",
            name, team, league, total);

        return PagedResponse<PlayerListItemDto>.Success(data, page, limit, total);
    }
}
