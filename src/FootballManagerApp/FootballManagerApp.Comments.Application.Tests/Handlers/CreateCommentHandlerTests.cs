using FluentAssertions;
using FootballManagerApp.Comments.Application.Comments.DTOs;
using FootballManagerApp.Comments.Application.Comments.Handlers;
using FootballManagerApp.Comments.Application.Comments.Validators;
using FootballManagerApp.Comments.Application.Common.Interfaces;
using FootballManagerApp.Comments.Domain.Entities;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace FootballManagerApp.Comments.Application.Tests.Handlers;

public class CreateCommentHandlerTests
{
    private static CreateCommentHandler Build(Mock<ICommentRepository> repo) =>
        new(repo.Object, new CreateCommentValidator(),
            NullLogger<CreateCommentHandler>.Instance);

    [Fact]
    public async Task Returns_400_when_playerId_empty()
    {
        var repo = new Mock<ICommentRepository>();
        var dto = new CreateCommentDto("Johan", "ok", 5, null, null, null, null);

        var result = await Build(repo).HandleAsync(Guid.Empty, dto, "u1", default);

        result.Status.Should().Be(400);
        repo.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Returns_400_when_rating_out_of_range()
    {
        var repo = new Mock<ICommentRepository>();
        var dto = new CreateCommentDto("Johan", "ok", 10m, null, null, null, null);

        var result = await Build(repo).HandleAsync(Guid.NewGuid(), dto, "u1", default);

        result.Status.Should().Be(400);
        result.Message.Should().Contain("Rating");
    }

    [Fact]
    public async Task Returns_400_when_text_empty()
    {
        var repo = new Mock<ICommentRepository>();
        var dto = new CreateCommentDto("Johan", "", 3m, null, null, null, null);

        var result = await Build(repo).HandleAsync(Guid.NewGuid(), dto, "u1", default);

        result.Status.Should().Be(400);
    }

    [Fact]
    public async Task Returns_201_and_persists_comment()
    {
        var repo = new Mock<ICommentRepository>();
        repo.Setup(r => r.CreateAsync(It.IsAny<Comment>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Comment c, CancellationToken _) => c);

        var dto = new CreateCommentDto("Johan", "Crack absoluto", 4.5m,
            36.84m, -2.46m, "Almería", "Spain");
        var playerId = Guid.NewGuid();

        var result = await Build(repo).HandleAsync(playerId, dto, "u1", default);

        result.Status.Should().Be(201);
        result.Data!.Author.Should().Be("Johan");
        result.Data!.PlayerId.Should().Be(playerId);
        repo.Verify(r => r.CreateAsync(It.IsAny<Comment>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }
}
