using FootballManagerApp.Players.Application.Common.DTOs;

namespace FootballManagerApp.Players.Application.Players.DTOs;

public record PlayerListItemDto(
    Guid Id,
    string Name,
    string Team,
    string League,
    string? Position,
    string? ImageUrl,
    decimal? Rating,
    DateTime RegisteredAt);

public record PlayerStatisticsDto(
    int Season,
    string? TeamName,
    string? LeagueName,
    int Appearances,
    int Goals,
    int Assists,
    decimal? Rating);

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
    IEnumerable<CommentDto> Comments);

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
    string? PlayerCountry);

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
