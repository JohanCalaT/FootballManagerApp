using FluentAssertions;
using FootballManagerApp.Players.Application.Common.Interfaces;
using FootballManagerApp.Players.Application.Players.Handlers;
using FootballManagerApp.Players.Domain.Entities;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace FootballManagerApp.Players.Application.Tests.Handlers;

public class DeletePlayerHandlerTests
{
    [Fact]
    public async Task Returns_404_when_player_missing()
    {
        var repo = new Mock<IPlayerRepository>();
        repo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Player?)null);

        var sut = new DeletePlayerHandler(repo.Object,
            NullLogger<DeletePlayerHandler>.Instance);

        var result = await sut.HandleAsync(Guid.NewGuid(), default);

        result.Status.Should().Be(404);
        repo.Verify(r => r.DeleteAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task Returns_204_when_deletion_succeeds()
    {
        var player = Player.Create("Pedri", "Barcelona", "La Liga", "u1");
        var repo = new Mock<IPlayerRepository>();
        repo.Setup(r => r.GetByIdAsync(player.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(player);

        var sut = new DeletePlayerHandler(repo.Object,
            NullLogger<DeletePlayerHandler>.Instance);

        var result = await sut.HandleAsync(player.Id, default);

        result.Status.Should().Be(204);
        repo.Verify(r => r.DeleteAsync(player.Id, It.IsAny<CancellationToken>()), Times.Once);
    }
}
