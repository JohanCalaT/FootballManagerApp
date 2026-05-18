namespace FootballManagerApp.Players.Application.Common.DTOs;

// DTOs de salida del IApiFootballService — los consume el Handler.
// Los DTOs crudos del HTTP (envelope, [JsonPropertyName], etc.) viven en
// Players.Infrastructure/ExternalServices/ApiFootball/Dtos/.

public record ApiFootballProfileSummary(
    int ApiFootballId,
    string Name,
    string? FirstName,
    string? LastName,
    string? Nationality,
    string? BirthDate,
    string? BirthPlace,
    string? BirthCountry,
    string? Height,
    string? Weight,
    int? ShirtNumber,
    string? Position,
    string? Photo);

public record ApiFootballImportData(
    ApiFootballProfileSummary Profile,
    IReadOnlyList<ApiFootballStatLine> Statistics);

public record ApiFootballStatLine(
    int Season,
    int? LeagueId,
    string LeagueName,
    string? LeagueCountry,
    string? LeagueLogo,
    int? TeamId,
    string TeamName,
    string? TeamLogo,
    int? Appearances,
    int? Lineups,
    int? Minutes,
    string? Position,
    decimal? Rating,
    bool Captain,
    int? SubstitutesIn,
    int? SubstitutesOut,
    int? SubstitutesBench,
    int? ShotsTotal,
    int? ShotsOn,
    int? Goals,
    int? GoalsConceded,
    int? GoalsSaves,
    int? Assists,
    int? PassesTotal,
    int? PassesKey,
    int? PassesAccuracy,
    int? TacklesTotal,
    int? TacklesBlocks,
    int? Interceptions,
    int? DuelsTotal,
    int? DuelsWon,
    int? DribblesAttempts,
    int? DribblesSuccess,
    int? FoulsDrawn,
    int? FoulsCommitted,
    int? CardsYellow,
    int? CardsYellowRed,
    int? CardsRed,
    int? PenaltyScored,
    int? PenaltyMissed,
    int? PenaltySaved);
