using System.Text.Json.Serialization;
using FootballManagerApp.Players.Application.Common.DTOs;
using FootballManagerApp.Shared.Responses;

namespace FootballManagerApp.Players.Application.Players.DTOs;

public record PlayerListItemDto(
    Guid Id,
    int? ApiFootballId,
    string Name,
    string Team,
    string League,
    string? Position,
    string? ImageUrl,
    decimal? Rating,
    DateTime RegisteredAt)
{
    /// <summary>
    /// Per-item HATEOAS affordances. Populated by the controller after the
    /// handler returns, so the handler stays unaware of HTTP. Includes
    /// <c>self</c> always and <c>update</c>/<c>delete</c> when the caller
    /// is admin (<c>X-User-Admin: true</c> as stamped by the Gateway).
    /// </summary>
    [JsonPropertyName("_links")]
    public Dictionary<string, HateoasLink>? Links { get; init; }
}

public record PlayerStatisticsDto(
    int Season,
    string? TeamName,
    string? LeagueName,
    int Appearances,
    int Goals,
    int Assists,
    decimal? Rating,
    // Manual-stat field per CLAUDE.md ("Solo rellena Season, TeamName,
    // LeagueName, Position, Appearances, Goals, Assists, Rating"). Defaulted
    // so the existing positional callers (mappers, fixtures) keep working
    // and the API-Football enriched rows still come through unchanged.
    string? Position = null);

/// <summary>
/// Nested shape for client / player geolocation in DTOs. Mirrors the
/// frontend's `Geolocation` interface — keeping the wire format nested
/// matches the domain value object and avoids the flat-fields tax that
/// the older `PlayerLat/PlayerLng/PlayerCity/PlayerCountry` shape paid.
/// </summary>
public record GeolocationDto(
    decimal Lat,
    decimal Lng,
    string? City,
    string? Country);

public record PlayerDetailDto(
    Guid Id,
    string Name,
    string? FirstName,
    string? LastName,
    string Team,
    string League,
    string? Position,
    string? Nationality,
    string? Height,
    string? Weight,
    string? ImageUrl,
    bool Injured,
    DateTime RegisteredAt,
    int Version,
    IEnumerable<PlayerStatisticsDto> Statistics,
    IEnumerable<CommentDto> Comments,
    // === Fields added so the edit page can load the full player state.
    // Appended as defaulted parameters so existing positional callers
    // (mappers, tests) keep compiling and the new ones are opt-in. ===
    int? ApiFootballId = null,
    DateTime? BirthDate = null,
    string? BirthPlace = null,
    string? BirthCountry = null,
    int? ShirtNumber = null,
    string? ImageSource = null,
    string? CreatedByUserId = null,
    GeolocationDto? ClientGeolocation = null,
    GeolocationDto? PlayerGeolocation = null);

public record CreatePlayerDto(
    string Name,
    string Team,
    string League,
    string? Position,
    string? ImageUrl,
    string? ImageSource,
    string? Nationality,
    DateTime? BirthDate,
    string? Height,
    string? Weight,
    int? ShirtNumber,
    decimal? PlayerLat,
    decimal? PlayerLng,
    string? PlayerCity,
    string? PlayerCountry,
    IEnumerable<PlayerStatisticsDto>? Statistics);

public record UpdatePlayerDto(
    string Name,
    string Team,
    string League,
    string? Position,
    string? ImageUrl,
    string? Nationality,
    DateTime? BirthDate,
    string? Height,
    string? Weight,
    int? ShirtNumber,
    decimal? PlayerLat,
    decimal? PlayerLng,
    string? PlayerCity,
    string? PlayerCountry,
    // === Fields added for the edit page. Defaulted to null so any
    // existing positional callers (tests) keep compiling unchanged; new
    // callers can use named arguments. PlayerGeolocation (nested)
    // wins over the legacy PlayerLat/Lng/City/Country if both are sent. ===
    string? FirstName = null,
    string? LastName = null,
    string? BirthPlace = null,
    string? BirthCountry = null,
    string? ImageSource = null,
    bool? Injured = null,
    GeolocationDto? PlayerGeolocation = null,
    GeolocationDto? ClientGeolocation = null,
    // Manual-stats subform — only honoured for manual players (ApiFootballId
    // null). The handler silently drops it for imported players because the
    // API-Football statistics are the source of truth and mixing manual
    // entries would skew the Equipo Ideal algorithm. `null` (omitted) leaves
    // the current statistics array untouched.
    IEnumerable<PlayerStatisticsDto>? Statistics = null);

public record ImportPlayerItemDto(
    int ApiFootballId,
    int Season);

public record ImportFailureDto(
    int ApiFootballId,
    int Season,
    string Reason);

public record ImportResultDto(
    IReadOnlyList<PlayerListItemDto> Imported,
    IReadOnlyList<ImportFailureDto> Failed);

public record GenerateIdealTeamDto(
    string Formation = "4-3-3",
    int? Season = null);
