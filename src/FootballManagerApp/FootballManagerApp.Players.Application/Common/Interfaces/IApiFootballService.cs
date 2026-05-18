using FootballManagerApp.Players.Application.Common.DTOs;

namespace FootballManagerApp.Players.Application.Common.Interfaces;

// Las implementaciones LANZAN ApiFootballException con un ApiFootballError
// envuelto cuando la API responde mal (rate-limit, key inválida, etc.).
// El Handler hace try/catch y mapea a ApiResponse con el status HTTP correcto.
public interface IApiFootballService
{
    // Returns the full result list for a query. API-Football's
    // /players/profiles?search= already returns every match in one call;
    // its own paging metadata is unreliable, so we drop it and paginate
    // locally in the controller from the Redis-cached list.
    Task<IReadOnlyList<ApiFootballProfileSummary>> SearchProfilesAsync(
        string query, CancellationToken ct);

    Task<IReadOnlyList<int>> GetSeasonsAsync(
        int apiFootballId, CancellationToken ct);

    Task<ApiFootballImportData?> GetPlayerImportDataAsync(
        int apiFootballId, int season, CancellationToken ct);
}
