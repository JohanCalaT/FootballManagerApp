using FootballManagerApp.Players.Application.Common.DTOs;

namespace FootballManagerApp.Players.Application.Common.Interfaces;

public interface IApiFootballService
{
    Task<IEnumerable<PlayerSearchResult>> SearchPlayersAsync(
        string query, CancellationToken ct);

    Task<IEnumerable<int>> GetSeasonsAsync(
        int playerId, CancellationToken ct);

    Task<ApiFootballPlayerData> GetPlayerStatsAsync(
        int playerId, int season, CancellationToken ct);
}
