using FootballManagerApp.Players.Application.Common.DTOs;
using FootballManagerApp.Players.Application.Players.DTOs;
using FootballManagerApp.Players.Domain.Entities;
using FootballManagerApp.Shared.ValueObjects;

namespace FootballManagerApp.Players.Application.Players.Mapping;

internal static class PlayerMappings
{
    private static GeolocationDto? ToDto(this Geolocation? g) =>
        g is null ? null : new GeolocationDto(g.Lat, g.Lng, g.City, g.Country);

    public static PlayerListItemDto ToListItem(this Player p) =>
        new(
            p.Id,
            p.ApiFootballId,
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
            p.Version,
            p.Statistics.Select(s => s.ToStatsDto()),
            comments,
            ApiFootballId: p.ApiFootballId,
            BirthDate: p.BirthDate,
            BirthPlace: p.BirthPlace,
            BirthCountry: p.BirthCountry,
            ShirtNumber: p.ShirtNumber,
            ImageSource: p.ImageSource,
            CreatedByUserId: p.CreatedByUserId,
            ClientGeolocation: p.ClientGeolocation.ToDto(),
            PlayerGeolocation: p.PlayerGeolocation.ToDto());

    public static PlayerStatisticsDto ToStatsDto(this PlayerStatistics s) =>
        new(s.Season, s.TeamName, s.LeagueName,
            s.Appearances, s.Goals, s.Assists, s.Rating);
}
