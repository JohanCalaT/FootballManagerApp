using FootballManagerApp.Comments.Application.Comments.DTOs;
using FootballManagerApp.Comments.Domain.Entities;

namespace FootballManagerApp.Comments.Application.Comments.Mapping;

internal static class CommentMappings
{
    public static CommentDto ToDto(this Comment c) =>
        new(c.Id, c.PlayerId, c.Author, c.Text, c.Rating, c.CreatedAt);
}
