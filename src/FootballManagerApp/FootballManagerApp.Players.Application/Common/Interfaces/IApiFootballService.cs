using FootballManagerApp.Players.Application.Common.DTOs;

namespace FootballManagerApp.Players.Application.Common.Interfaces;

// Las implementaciones LANZAN ApiFootballException con un ApiFootballError
// envuelto cuando la API responde mal (rate-limit, key inválida, etc.).
// El Handler hace try/catch y mapea a ApiResponse con el status HTTP correcto.
public interface IApiFootballService
{
    // page = 1-indexed. Cada página de API-Football = 20 resultados.
    Task<ApiFootballSearchPage> SearchProfilesAsync(
        string query, int page, CancellationToken ct);

    Task<IReadOnlyList<int>> GetSeasonsAsync(
        int apiFootballId, CancellationToken ct);

    Task<ApiFootballImportData?> GetPlayerImportDataAsync(
        int apiFootballId, int season, CancellationToken ct);
}
