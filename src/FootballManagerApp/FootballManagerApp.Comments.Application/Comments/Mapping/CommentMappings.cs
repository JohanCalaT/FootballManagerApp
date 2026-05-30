using FootballManagerApp.Comments.Application.Comments.DTOs;
using FootballManagerApp.Comments.Domain.Entities;
using FootballManagerApp.Shared.ValueObjects;

namespace FootballManagerApp.Comments.Application.Comments.Mapping;

internal static class CommentMappings
{
    public static CommentDto ToDto(this Comment c) =>
        new(c.Id, c.PlayerId, c.Author, c.Text, c.Rating, c.CreatedAt,
            CreatedByUserId: c.CreatedByUserId,
            ClientGeolocation: c.ClientGeolocation.ToDto());

    private static GeolocationDto? ToDto(this Geolocation? g) =>
        g is null ? null : new GeolocationDto(g.Lat, g.Lng, g.City, g.Country);
}
