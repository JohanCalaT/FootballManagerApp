using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.RateLimiting;
using FootballManagerApp.Players.Application.Common.ApiFootball;
using FootballManagerApp.Players.Application.Common.DTOs;
using FootballManagerApp.Players.Application.Common.Interfaces;
using FootballManagerApp.Players.Infrastructure.ExternalServices.ApiFootball.Dtos;
using FootballManagerApp.Shared.Constants;
using Microsoft.Extensions.Logging;
using Polly.CircuitBreaker;
using Polly.RateLimiting;

namespace FootballManagerApp.Players.Infrastructure.ExternalServices.ApiFootball;

public sealed class ApiFootballService : IApiFootballService
{
    // TTLs por convención (§10 del SDD).
    private static readonly TimeSpan ProfileSearchTtl = TimeSpan.FromHours(6);
    private static readonly TimeSpan SeasonsTtl       = TimeSpan.FromDays(7);
    private static readonly TimeSpan StatsTtl         = TimeSpan.FromDays(30);
    private static readonly TimeSpan EmptyResultTtl   = TimeSpan.FromMinutes(5);

    private readonly HttpClient _http;
    private readonly ICacheService _cache;
    private readonly ILogger<ApiFootballService> _logger;

    public ApiFootballService(
        HttpClient http,
        ICacheService cache,
        ILogger<ApiFootballService> logger)
    {
        _http = http;
        _cache = cache;
        _logger = logger;
    }

    // ─────────────────────────── 4.1 — Search profiles ───────────────────────────
    // API-Football's /players/profiles?search= returns every match in one call
    // (its `paging` envelope is misleading — `pages` is computed against an
    // internal page size that does not affect the response body). We cache the
    // full list under a single key and let the controller paginate locally,
    // so subsequent pages are Redis hits and the 100/day quota is preserved.
    public async Task<IReadOnlyList<ApiFootballProfileSummary>> SearchProfilesAsync(
        string query, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(query) || query.Trim().Length < 3)
            throw new ApiFootballException(
                new ApiFootballError.InvalidParameter("search (mínimo 3 caracteres)"));

        var normalized = ApiFootballParsers.NormalizeQuery(query);
        var key = $"af:profiles:search:{normalized}";

        var cached = await _cache.GetAsync<List<ApiFootballProfileSummary>>(key, ct);
        if (cached is not null)
        {
            _logger.LogDebug("ApiFootball cache HIT {Key}", key);
            return cached;
        }

        var envelope = await SendAsync<ApiFootballEnvelope<ApiFootballProfileResponse>>(
            $"players/profiles?search={Uri.EscapeDataString(normalized)}", ct);

        var items = envelope.Response
            .Select(r => MapToSummary(r.Player))
            .ToList();

        var ttl = items.Count == 0 ? EmptyResultTtl : ProfileSearchTtl;
        await _cache.SetAsync(key, items, ttl, ct);

        return items;
    }

    // ─────────────────────────── 4.2 — Seasons ───────────────────────────
    public async Task<IReadOnlyList<int>> GetSeasonsAsync(
        int apiFootballId, CancellationToken ct)
    {
        if (apiFootballId <= 0)
            throw new ApiFootballException(
                new ApiFootballError.InvalidParameter("player (id > 0)"));

        var key = $"af:player:seasons:{apiFootballId}";

        var cached = await _cache.GetAsync<List<int>>(key, ct);
        if (cached is not null)
        {
            _logger.LogDebug("ApiFootball cache HIT {Key}", key);
            return cached;
        }

        var envelope = await SendAsync<ApiFootballEnvelope<int>>(
            $"players/seasons?player={apiFootballId}", ct);

        var valid = envelope.Response
            .Where(ApiFootballSeasons.IsValid)
            .OrderByDescending(s => s)
            .ToList();

        var ttl = valid.Count == 0 ? EmptyResultTtl : SeasonsTtl;
        await _cache.SetAsync(key, valid, ttl, ct);

        return valid;
    }

    // ─────────────────────────── 4.3 — Stats for import ───────────────────────────
    public async Task<ApiFootballImportData?> GetPlayerImportDataAsync(
        int apiFootballId, int season, CancellationToken ct)
    {
        if (apiFootballId <= 0)
            throw new ApiFootballException(
                new ApiFootballError.InvalidParameter("id (> 0)"));
        if (!ApiFootballSeasons.IsValid(season))
            throw new ApiFootballException(
                new ApiFootballError.SeasonNotAvailable(season));

        var key = $"af:player:stats:{apiFootballId}:{season}";

        var cached = await _cache.GetAsync<ApiFootballImportData>(key, ct);
        if (cached is not null)
        {
            _logger.LogDebug("ApiFootball cache HIT {Key}", key);
            return cached;
        }

        var envelope = await SendAsync<ApiFootballEnvelope<ApiFootballStatsResponse>>(
            $"players?id={apiFootballId}&season={season}", ct);

        if (envelope.Response.Count == 0)
            return null; // jugador no jugó esa temporada — Handler responde 404

        var raw = envelope.Response[0];
        var data = new ApiFootballImportData(
            Profile:    MapToSummary(raw.Player),
            Statistics: raw.Statistics.Select(MapStatLine).ToList());

        await _cache.SetAsync(key, data, StatsTtl, ct);
        return data;
    }

    // ─────────────────────────── HTTP core + error handling ───────────────────────────
    private async Task<TEnvelope> SendAsync<TEnvelope>(string relativeUrl, CancellationToken ct)
        where TEnvelope : class
    {
        HttpResponseMessage response;
        try
        {
            response = await _http.GetAsync(relativeUrl, ct);
        }
        catch (BrokenCircuitException ex)
        {
            _logger.LogWarning(ex, "ApiFootball circuit open on {Url}", relativeUrl);
            throw new ApiFootballException(new ApiFootballError.UpstreamError(null));
        }
        catch (RateLimiterRejectedException ex)
        {
            _logger.LogWarning(ex,
                "ApiFootball local rate-limit hit on {Url} (Polly token bucket)", relativeUrl);
            throw new ApiFootballException(new ApiFootballError.RateLimited());
        }
        catch (TaskCanceledException ex) when (!ct.IsCancellationRequested)
        {
            _logger.LogWarning(ex, "ApiFootball timeout on {Url}", relativeUrl);
            throw new ApiFootballException(new ApiFootballError.Timeout());
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "ApiFootball network error on {Url}", relativeUrl);
            throw new ApiFootballException(new ApiFootballError.UpstreamError(null));
        }

        // HTTP-level errors
        var statusCode = (int)response.StatusCode;
        if (statusCode == 401 || statusCode == 403)
        {
            _logger.LogError(
                "ApiFootball auth failed ({Status}) on {Url}", statusCode, relativeUrl);
            throw new ApiFootballException(new ApiFootballError.AuthenticationFailed());
        }
        if (statusCode == 429)
            throw new ApiFootballException(new ApiFootballError.RateLimited());
        if (statusCode >= 500)
            throw new ApiFootballException(new ApiFootballError.UpstreamError(statusCode));
        if (statusCode >= 400)
            throw new ApiFootballException(new ApiFootballError.UpstreamError(statusCode));

        // HTTP 200 con cuerpo
        var envelope = await response.Content.ReadFromJsonAsync<TEnvelope>(ct)
            ?? throw new ApiFootballException(
                new ApiFootballError.UpstreamError(statusCode));

        // Inspeccionar el campo errors (regla de oro §2 del SDD).
        // Usamos reflexión porque TEnvelope es ApiFootballEnvelope<T> con un T variable.
        var errorsProp = envelope.GetType().GetProperty("Errors");
        if (errorsProp?.GetValue(envelope) is JsonElement errors
            && HasBodyErrors(errors, out var rawJson))
        {
            throw new ApiFootballException(ClassifyBodyError(rawJson!));
        }

        return envelope;
    }

    internal static bool HasBodyErrors(JsonElement errors, out string? rawJson)
    {
        rawJson = null;
        if (errors.ValueKind == JsonValueKind.Array && errors.GetArrayLength() == 0)
            return false;
        if (errors.ValueKind == JsonValueKind.Object && !errors.EnumerateObject().Any())
            return false;
        if (errors.ValueKind == JsonValueKind.Null
            || errors.ValueKind == JsonValueKind.Undefined)
            return false;
        rawJson = errors.GetRawText();
        return true;
    }

    internal static ApiFootballError ClassifyBodyError(string rawJson)
    {
        var lower = rawJson.ToLowerInvariant();
        if (lower.Contains("missing application key") || lower.Contains("token"))
            return new ApiFootballError.AuthenticationFailed();
        if (lower.Contains("request limit for the day"))
            return new ApiFootballError.DailyQuotaExceeded();
        if (lower.Contains("rate limit") || lower.Contains("per minute"))
            return new ApiFootballError.RateLimited();
        if (lower.Contains("no coverage") || lower.Contains("plan does not allow"))
            return new ApiFootballError.SeasonNotAvailable(0);
        return new ApiFootballError.UpstreamError(200);
    }

    // ─────────────────────────── Mappers wire → App DTOs ───────────────────────────
    private static ApiFootballProfileSummary MapToSummary(ApiFootballPlayerDto p) =>
        new(
            ApiFootballId: p.Id,
            Name:          p.Name,
            FirstName:     p.FirstName,
            LastName:      p.LastName,
            Nationality:   p.Nationality,
            BirthDate:     p.Birth?.Date,
            BirthPlace:    p.Birth?.Place,
            BirthCountry:  p.Birth?.Country,
            Height:        ApiFootballParsers.CleanLabel(p.Height),
            Weight:        ApiFootballParsers.CleanLabel(p.Weight),
            ShirtNumber:   p.Number,
            Position:      p.Position,
            Photo:         p.Photo);

    private static ApiFootballStatLine MapStatLine(ApiFootballStatisticsDto s) =>
        new(
            Season:            s.League.Season,
            LeagueId:          s.League.Id,
            LeagueName:        s.League.Name,
            LeagueCountry:     s.League.Country,
            LeagueLogo:        s.League.Logo,
            TeamId:            s.Team.Id,
            TeamName:          s.Team.Name,
            TeamLogo:          s.Team.Logo,
            Appearances:       s.Games?.Appearances,
            Lineups:           s.Games?.Lineups,
            Minutes:           s.Games?.Minutes,
            Position:          s.Games?.Position,
            Rating:            ApiFootballParsers.ParseRating(s.Games?.Rating),
            Captain:           s.Games?.Captain ?? false,
            SubstitutesIn:     s.Substitutes?.In,
            SubstitutesOut:    s.Substitutes?.Out,
            SubstitutesBench:  s.Substitutes?.Bench,
            ShotsTotal:        s.Shots?.Total,
            ShotsOn:           s.Shots?.On,
            Goals:             s.Goals?.Total,
            GoalsConceded:     s.Goals?.Conceded,
            GoalsSaves:        s.Goals?.Saves,
            Assists:           s.Goals?.Assists,
            PassesTotal:       s.Passes?.Total,
            PassesKey:         s.Passes?.Key,
            PassesAccuracy:    s.Passes?.Accuracy,
            TacklesTotal:      s.Tackles?.Total,
            TacklesBlocks:     s.Tackles?.Blocks,
            Interceptions:     s.Tackles?.Interceptions,
            DuelsTotal:        s.Duels?.Total,
            DuelsWon:          s.Duels?.Won,
            DribblesAttempts:  s.Dribbles?.Attempts,
            DribblesSuccess:   s.Dribbles?.Success,
            FoulsDrawn:        s.Fouls?.Drawn,
            FoulsCommitted:    s.Fouls?.Committed,
            CardsYellow:       s.Cards?.Yellow,
            CardsYellowRed:    s.Cards?.YellowRed,
            CardsRed:          s.Cards?.Red,
            PenaltyScored:     s.Penalty?.Scored,
            PenaltyMissed:     s.Penalty?.Missed,
            PenaltySaved:      s.Penalty?.Saved);
}
