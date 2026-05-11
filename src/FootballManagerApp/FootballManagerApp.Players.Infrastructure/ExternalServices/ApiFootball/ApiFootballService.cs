using FootballManagerApp.Players.Application.Common.DTOs;
using FootballManagerApp.Players.Application.Common.Interfaces;
using Microsoft.Extensions.Configuration;

namespace FootballManagerApp.Players.Infrastructure.ExternalServices.ApiFootball;

public class ApiFootballService : IApiFootballService
{
    private readonly HttpClient _http;
    private readonly IConfiguration _config;

    public ApiFootballService(HttpClient http, IConfiguration config)
    {
        _http = http;
        _config = config;
    }

    public Task<IEnumerable<PlayerSearchResult>> SearchPlayersAsync(
        string query, CancellationToken ct) =>
        throw new NotImplementedException("TODO Fase 2");

    public Task<IEnumerable<int>> GetSeasonsAsync(
        int playerId, CancellationToken ct) =>
        throw new NotImplementedException("TODO Fase 2");

    public Task<ApiFootballPlayerData> GetPlayerStatsAsync(
        int playerId, int season, CancellationToken ct) =>
        throw new NotImplementedException("TODO Fase 2");
}
