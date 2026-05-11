namespace FootballManagerApp.Players.Application.Common.DTOs;

public record PlayerSearchResult(
    int ApiFootballId,
    string Name,
    string? Photo,
    string? Position,
    string? Nationality);

public record ApiFootballStatistics(
    int Season,
    string TeamName,
    string LeagueName,
    int Appearances,
    int Goals,
    int Assists,
    decimal? Rating);

public record ApiFootballPlayerData(
    PlayerSearchResult Player,
    IEnumerable<ApiFootballStatistics> Statistics);
