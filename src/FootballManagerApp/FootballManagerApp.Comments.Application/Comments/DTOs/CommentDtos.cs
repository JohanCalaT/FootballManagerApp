namespace FootballManagerApp.Comments.Application.Comments.DTOs;

public record CommentDto(
    Guid Id,
    Guid PlayerId,
    string Author,
    string Text,
    int Rating,
    DateTime CreatedAt);

public record CreateCommentDto(
    string Author,
    string Text,
    int Rating,
    decimal? ClientLat,
    decimal? ClientLng,
    string? ClientCity,
    string? ClientCountry);
