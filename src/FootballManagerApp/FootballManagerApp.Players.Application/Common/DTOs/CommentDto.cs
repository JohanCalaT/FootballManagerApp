namespace FootballManagerApp.Players.Application.Common.DTOs;

public record CommentDto(
    Guid Id,
    string Author,
    string Text,
    decimal Rating,
    DateTime CreatedAt);
