using FluentAssertions;
using FootballManagerApp.Players.Application.Common.Interfaces;
using FootballManagerApp.Players.Application.Players.Handlers;
using FootballManagerApp.Players.Domain.Entities;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace FootballManagerApp.Players.Application.Tests.Handlers;

public class DeletePlayerHandlerTests
{
    private static DeletePlayerHandler Build(
        Mock<IPlayerRepository> repo, Mock<ICommentsClient>? client = null) =>
        new(repo.Object,
            (client ?? new Mock<ICommentsClient>()).Object,
            NullLogger<DeletePlayerHandler>.Instance);

    [Fact]
    public async Task Returns_204_when_player_missing_idempotent()
    {
        var repo = new Mock<IPlayerRepository>();
        var result = await Build(repo).HandleAsync(Guid.NewGuid(), default);

        result.Status.Should().Be(204);
        // Sigue llamando al repo (que es no-op si no existe).
        repo.Verify(r => r.DeleteAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task Returns_204_and_cascades_to_comments()
    {
        var player = Player.Create("Pedri", "Barcelona", "La Liga", "u1");
        var repo = new Mock<IPlayerRepository>();
        repo.Setup(r => r.GetByIdAsync(player.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(player);
        var client = new Mock<ICommentsClient>();
        client.Setup(c => c.DeleteByPlayerIdAsync(player.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var result = await Build(repo, client).HandleAsync(player.Id, default);

        result.Status.Should().Be(204);
        repo.Verify(r => r.DeleteAsync(player.Id, It.IsAny<CancellationToken>()), Times.Once);
        client.Verify(c => c.DeleteByPlayerIdAsync(player.Id, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task Still_returns_204_when_comment_cascade_fails()
    {
        var player = Player.Create("Pedri", "Barcelona", "La Liga", "u1");
        var repo = new Mock<IPlayerRepository>();
        repo.Setup(r => r.GetByIdAsync(player.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(player);
        var client = new Mock<ICommentsClient>();
        client.Setup(c => c.DeleteByPlayerIdAsync(player.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false); // Comments.API down

        var result = await Build(repo, client).HandleAsync(player.Id, default);

        result.Status.Should().Be(204);
        repo.Verify(r => r.DeleteAsync(player.Id, It.IsAny<CancellationToken>()), Times.Once);
    }
}
