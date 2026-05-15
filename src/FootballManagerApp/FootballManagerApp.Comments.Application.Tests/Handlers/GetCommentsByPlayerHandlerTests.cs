using FluentAssertions;
using FootballManagerApp.Comments.Application.Comments.Handlers;
using FootballManagerApp.Comments.Application.Common.Interfaces;
using FootballManagerApp.Comments.Domain.Entities;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace FootballManagerApp.Comments.Application.Tests.Handlers;

public class GetCommentsByPlayerHandlerTests
{
    [Fact]
    public async Task Returns_mapped_comments_for_player()
    {
        var playerId = Guid.NewGuid();
        var comments = new[]
        {
            Comment.Create(playerId, "Johan", "crack", 5),
            Comment.Create(playerId, "Maria", "ok", 3),
        };
        var repo = new Mock<ICommentRepository>();
        repo.Setup(r => r.GetByPlayerIdAsync(playerId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(comments);

        var sut = new GetCommentsByPlayerHandler(repo.Object,
            NullLogger<GetCommentsByPlayerHandler>.Instance);

        var result = await sut.HandleAsync(playerId, default);

        result.Status.Should().Be(200);
        result.Data.Should().HaveCount(2);
    }

    [Fact]
    public async Task Returns_empty_list_when_no_comments()
    {
        var repo = new Mock<ICommentRepository>();
        repo.Setup(r => r.GetByPlayerIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<Comment>());

        var sut = new GetCommentsByPlayerHandler(repo.Object,
            NullLogger<GetCommentsByPlayerHandler>.Instance);

        var result = await sut.HandleAsync(Guid.NewGuid(), default);

        result.Status.Should().Be(200);
        result.Data.Should().BeEmpty();
    }
}
