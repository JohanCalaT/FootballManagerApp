using FootballManagerApp.Players.Application.Common.ApiFootball;
using FootballManagerApp.Players.Application.Common.DTOs;
using FootballManagerApp.Players.Application.Common.Interfaces;
using FootballManagerApp.Players.Application.Players.DTOs;
using FootballManagerApp.Players.Application.Players.Mapping;
using FootballManagerApp.Players.Domain.Entities;
using FootballManagerApp.Players.Domain.Exceptions;
using FootballManagerApp.Shared.Constants;
using FootballManagerApp.Shared.Exceptions;
using FootballManagerApp.Shared.Responses;
using FootballManagerApp.Shared.ValueObjects;
using Microsoft.Extensions.Logging;

namespace FootballManagerApp.Players.Application.Players.Handlers;

public class ImportPlayersHandler
{
    // El plan gratis de API-Football permite 10 req/min. Cada item = 1 request
    // (cache miss). Alineamos el batch máximo con esa ventana para que un
    // único POST nunca pueda saturar la cuota por minuto.
    public const int MaxItemsPerBatch = 10;

    private readonly IApiFootballService _apiFootball;
    private readonly IPlayerRepository _repo;
    private readonly ILogger<ImportPlayersHandler> _logger;

    public ImportPlayersHandler(
        IApiFootballService apiFootball,
        IPlayerRepository repo,
        ILogger<ImportPlayersHandler> logger)
    {
        _apiFootball = apiFootball;
        _repo = repo;
        _logger = logger;
    }

    public async Task<ApiResponse<ImportResultDto>> HandleAsync(
        IEnumerable<ImportPlayerItemDto> items,
        string userId,
        decimal? clientLat,
        decimal? clientLng,
        string? clientCity,
        string? clientCountry,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return ApiResponse<ImportResultDto>.Unauthorized();

        var list = items?.ToList() ?? new List<ImportPlayerItemDto>();
        if (list.Count == 0)
            return ApiResponse<ImportResultDto>.BadRequest(
                "Debes enviar al menos un { apiFootballId, season }");
        if (list.Count > MaxItemsPerBatch)
            return ApiResponse<ImportResultDto>.BadRequest(
                $"Máximo {MaxItemsPerBatch} jugadores por petición " +
                "(alineado con el rate-limit por minuto de API-Football). " +
                $"Recibidos: {list.Count}");

        // Validación previa de inputs (sin tocar API-Football).
        foreach (var item in list)
        {
            if (item.ApiFootballId <= 0)
                return ApiResponse<ImportResultDto>.BadRequest(
                    $"apiFootballId inválido: {item.ApiFootballId}");
            if (!ApiFootballSeasons.IsValid(item.Season))
                return ApiResponse<ImportResultDto>.BadRequest(
                    $"Temporada {item.Season} no disponible. Usa 2022, 2023 o 2024.");
        }

        Geolocation? clientGeo = null;
        if (clientLat.HasValue && clientLng.HasValue)
            clientGeo = Geolocation.Create(
                clientLat.Value, clientLng.Value, clientCity, clientCountry);

        var imported = new List<PlayerListItemDto>();
        var failed   = new List<ImportFailureDto>();
        var aborted  = false;
        ApiFootballError? firstApiError = null;

        foreach (var item in list)
        {
            if (aborted)
            {
                // Una vez rate-limited paramos: añadir como skipped en vez de quemar más cuota.
                failed.Add(new ImportFailureDto(item.ApiFootballId, item.Season,
                    "Skipped — batch detenido tras rate-limit"));
                continue;
            }

            try
            {
                if (await _repo.ExistsAsync(item.ApiFootballId, item.Season, ct))
                {
                    failed.Add(new ImportFailureDto(item.ApiFootballId, item.Season,
                        "Ya importado"));
                    continue;
                }

                var data = await _apiFootball.GetPlayerImportDataAsync(
                    item.ApiFootballId, item.Season, ct);

                if (data is null || data.Statistics.Count == 0)
                {
                    failed.Add(new ImportFailureDto(item.ApiFootballId, item.Season,
                        $"Jugador {item.ApiFootballId} sin datos para {item.Season}"));
                    continue;
                }

                var player = BuildPlayer(data, userId, clientGeo);
                await _repo.CreateAsync(player, ct);
                imported.Add(player.ToListItem());

                _logger.LogInformation(
                    "Imported player {ApiId} season {Season} → {PlayerId}",
                    item.ApiFootballId, item.Season, player.Id);
            }
            catch (ApiFootballException ex)
            {
                failed.Add(new ImportFailureDto(item.ApiFootballId, item.Season, ex.Error.Message));
                firstApiError ??= ex.Error;

                // Si es rate-limit o quota → no merece la pena seguir, marcaríamos
                // los siguientes como skipped automáticamente.
                if (ex.Error is ApiFootballError.RateLimited
                    or ApiFootballError.DailyQuotaExceeded)
                {
                    _logger.LogWarning(
                        "Aborting batch — rate-limit / quota exceeded mid-loop");
                    aborted = true;
                }
            }
            catch (PlayerAlreadyExistsException ex)
            {
                _logger.LogWarning(ex,
                    "DB unique violation importing {ApiId}", item.ApiFootballId);
                failed.Add(new ImportFailureDto(item.ApiFootballId, item.Season,
                    "Conflicto: el jugador ya existe activo"));
            }
            catch (DomainException ex)
            {
                _logger.LogWarning(ex, "Domain validation failed importing {ApiId}",
                    item.ApiFootballId);
                failed.Add(new ImportFailureDto(item.ApiFootballId, item.Season, ex.Message));
            }
        }

        var payload = new ImportResultDto(imported, failed);
        return SelectStatus(imported.Count, failed.Count, payload, firstApiError);
    }

    private static ApiResponse<ImportResultDto> SelectStatus(
        int importedCount, int failedCount, ImportResultDto payload,
        ApiFootballError? firstApiError)
    {
        // Todos OK → 201 Created.
        if (failedCount == 0)
            return ApiResponse<ImportResultDto>.Created(payload,
                $"{importedCount} jugador(es) importado(s)");

        // Algunos OK, algunos fallaron → 207 Multi-Status.
        if (importedCount > 0)
            return new ApiResponse<ImportResultDto>
            {
                Status = 207,
                Message = $"{importedCount} importados, {failedCount} con error",
                Data = payload,
            };

        // Todos fallaron — propagamos el status del primer ApiFootballError si lo hubo,
        // si no es 409 (típicamente todos duplicados o validación fallida).
        var status = firstApiError switch
        {
            ApiFootballError.AuthenticationFailed                    => 500,
            ApiFootballError.RateLimited or
                ApiFootballError.DailyQuotaExceeded                  => 503,
            ApiFootballError.Timeout                                  => 504,
            ApiFootballError.UpstreamError                            => 502,
            ApiFootballError.NotFound                                 => 404,
            ApiFootballError.SeasonNotAvailable                       => 422,
            _                                                          => 409,
        };
        return new ApiResponse<ImportResultDto>
        {
            Status = status,
            Message = firstApiError?.Message
                ?? "Ningún jugador nuevo importado",
            Data = payload,
        };
    }

    private static Player BuildPlayer(
        ApiFootballImportData data, string userId, Geolocation? clientGeo)
    {
        var profile = data.Profile;

        // El endpoint /players?id=X&season=Y devuelve los stats en orden arbitrario.
        // La entrada con más minutos suele ser el "equipo/liga principal" del jugador
        // (ej. Cristiano 2022 → Pro League/Al-Nassr, no Super Cup).
        var primary = data.Statistics
            .OrderByDescending(s => s.Minutes ?? 0)
            .ThenByDescending(s => s.Appearances ?? 0)
            .First();

        // /players NO trae player.position; vive en statistics[].games.position.
        var position = profile.Position
            ?? primary.Position
            ?? data.Statistics.FirstOrDefault(s => !string.IsNullOrEmpty(s.Position))?.Position;

        var player = Player.Create(
            name:            profile.Name,
            team:            primary.TeamName,
            league:          primary.LeagueName,
            createdByUserId: userId);

        player.SetApiFootballId(profile.ApiFootballId);

        player.SetPersonalInfo(
            firstName:    profile.FirstName,
            lastName:     profile.LastName,
            nationality:  profile.Nationality,
            birthDate:    ParseBirthDate(profile.BirthDate),
            birthPlace:   profile.BirthPlace,
            birthCountry: profile.BirthCountry,
            height:       profile.Height,
            weight:       profile.Weight);

        player.SetFootballInfo(
            position:    position,
            shirtNumber: profile.ShirtNumber);

        if (!string.IsNullOrWhiteSpace(profile.Photo))
            player.SetImage(profile.Photo, ImageSource.Api);

        if (clientGeo is not null)
            player.SetClientGeolocation(clientGeo);

        foreach (var s in data.Statistics)
            player.AddStatistics(BuildStats(player.Id, s));

        return player;
    }

    private static PlayerStatistics BuildStats(Guid playerId, ApiFootballStatLine s)
    {
        var stats = PlayerStatistics.Create(playerId, s.Season, s.TeamName, s.LeagueName);

        stats.SetLeague(s.LeagueId, s.LeagueName, s.LeagueCountry, s.LeagueLogo);
        stats.SetTeam(s.TeamId, s.TeamName, s.TeamLogo);

        stats.SetGames(
            appearances:   s.Appearances ?? 0,
            lineups:       s.Lineups ?? 0,
            minutesPlayed: s.Minutes ?? 0,
            position:      s.Position,
            rating:        s.Rating,
            captain:       s.Captain);

        stats.SetSubstitutes(
            s.SubstitutesIn ?? 0,
            s.SubstitutesOut ?? 0,
            s.SubstitutesBench ?? 0);

        stats.SetOffensive(
            shotsTotal:    s.ShotsTotal ?? 0,
            shotsOnTarget: s.ShotsOn ?? 0,
            goals:         s.Goals ?? 0,
            assists:       s.Assists ?? 0,
            penaltyScored: s.PenaltyScored ?? 0,
            penaltyMissed: s.PenaltyMissed ?? 0);

        stats.SetDefensive(
            goalsConceded:  s.GoalsConceded ?? 0,
            goalsSaved:     s.GoalsSaves ?? 0,
            penaltySaved:   s.PenaltySaved ?? 0,
            tacklesTotal:   s.TacklesTotal ?? 0,
            tacklesBlocks:  s.TacklesBlocks ?? 0,
            interceptions:  s.Interceptions ?? 0);

        stats.SetPassingAndDribbling(
            passesTotal:      s.PassesTotal ?? 0,
            passesKey:        s.PassesKey ?? 0,
            passesAccuracy:   s.PassesAccuracy ?? 0,
            duelsTotal:       s.DuelsTotal ?? 0,
            duelsWon:         s.DuelsWon ?? 0,
            dribblesAttempts: s.DribblesAttempts ?? 0,
            dribblesSuccess:  s.DribblesSuccess ?? 0);

        stats.SetDiscipline(
            foulsDrawn:     s.FoulsDrawn ?? 0,
            foulsCommitted: s.FoulsCommitted ?? 0,
            yellowCards:    s.CardsYellow ?? 0,
            yellowRedCards: s.CardsYellowRed ?? 0,
            redCards:       s.CardsRed ?? 0);

        return stats;
    }

    private static DateTime? ParseBirthDate(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        if (!DateTime.TryParseExact(
                raw, "yyyy-MM-dd",
                System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.AssumeUniversal
                | System.Globalization.DateTimeStyles.AdjustToUniversal,
                out var v))
            return null;
        return DateTime.SpecifyKind(v, DateTimeKind.Utc);
    }
}
