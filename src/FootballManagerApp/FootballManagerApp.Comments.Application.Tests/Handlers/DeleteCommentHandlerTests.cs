using FluentAssertions;
using FootballManagerApp.Comments.Application.Comments.Handlers;
using FootballManagerApp.Comments.Application.Common.Interfaces;
using FootballManagerApp.Comments.Domain.Entities;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace FootballManagerApp.Comments.Application.Tests.Handlers;

public class DeleteCommentHandlerTests
{
    [Fact]
    public async Task Returns_404_when_comment_missing()
    {
        var repo = new Mock<ICommentRepository>();
        repo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Comment?)null);

        var sut = new DeleteCommentHandler(repo.Object,
            NullLogger<DeleteCommentHandler>.Instance);

        var result = await sut.HandleAsync(Guid.NewGuid(), default);

        result.Status.Should().Be(404);
        repo.Verify(r => r.DeleteAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task Returns_204_when_deletion_succeeds()
    {
        var comment = Comment.Create(Guid.NewGuid(), "Johan", "ok", 5);
        var repo = new Mock<ICommentRepository>();
        repo.Setup(r => r.GetByIdAsync(comment.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(comment);

        var sut = new DeleteCommentHandler(repo.Object,
            NullLogger<DeleteCommentHandler>.Instance);

        var result = await sut.HandleAsync(comment.Id, default);

        result.Status.Should().Be(204);
        repo.Verify(r => r.DeleteAsync(comment.Id, It.IsAny<CancellationToken>()), Times.Once);
    }
}
