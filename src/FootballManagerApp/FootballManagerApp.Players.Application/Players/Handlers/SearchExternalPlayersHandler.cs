using FootballManagerApp.Players.Application.Common.DTOs;
using FootballManagerApp.Players.Application.Common.Interfaces;
using FootballManagerApp.Shared.Responses;
using Microsoft.Extensions.Logging;

namespace FootballManagerApp.Players.Application.Players.Handlers;

// Wraps IApiFootballService.SearchProfilesAsync with the project's
// pagination contract (PagedResponse<T>). The service returns the full
// match list cached in Redis under af:profiles:search:{query}; this
// handler slices it locally so subsequent pages are Redis-only hits.
public class SearchExternalPlayersHandler
{
    private readonly IApiFootballService _apiFootball;
    private readonly ILogger<SearchExternalPlayersHandler> _logger;

    public SearchExternalPlayersHandler(
        IApiFootballService apiFootball,
        ILogger<SearchExternalPlayersHandler> logger)
    {
        _apiFootball = apiFootball;
        _logger = logger;
    }

    public async Task<PagedResponse<ApiFootballProfileSummary>> HandleAsync(
        string query, int page, int limit, CancellationToken ct)
    {
        if (page < 1) page = 1;
        if (limit < 1) limit = 10;
        if (limit > 50) limit = 50;

        var all = await _apiFootball.SearchProfilesAsync(query, ct);

        var data = all.Skip((page - 1) * limit).Take(limit).ToList();

        _logger.LogInformation(
            "Searched API-Football profiles query={Query} page={Page} limit={Limit} total={Total}",
            query, page, limit, all.Count);

        return PagedResponse<ApiFootballProfileSummary>.Success(
            data:  data,
            page:  page,
            limit: limit,
            total: all.Count);
    }
}
