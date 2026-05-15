using FootballManagerApp.Players.Application.Common.DTOs;
using FootballManagerApp.Players.Application.Players.DTOs;
using FootballManagerApp.Players.Domain.Entities;

namespace FootballManagerApp.Players.Application.Players.Mapping;

internal static class PlayerMappings
{
    public static PlayerListItemDto ToListItem(this Player p) =>
        new(
            p.Id,
            p.Name,
            p.Team,
            p.League,
            p.Position,
            p.ImageUrl,
            p.Statistics.OrderByDescending(s => s.Season).FirstOrDefault()?.Rating,
            p.RegisteredAt);

    public static PlayerDetailDto ToDetail(
        this Player p, IEnumerable<CommentDto> comments) =>
        new(
            p.Id,
            p.Name,
            p.FirstName,
            p.LastName,
            p.Team,
            p.League,
            p.Position,
            p.Nationality,
            p.Height,
            p.Weight,
            p.ImageUrl,
            p.Injured,
            p.RegisteredAt,
            p.Statistics.Select(s => s.ToStatsDto()),
            comments);

    public static PlayerStatisticsDto ToStatsDto(this PlayerStatistics s) =>
        new(s.Season, s.TeamName, s.LeagueName,
            s.Appearances, s.Goals, s.Assists, s.Rating);
}
