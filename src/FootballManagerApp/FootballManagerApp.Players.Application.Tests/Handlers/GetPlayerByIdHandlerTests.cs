using FluentAssertions;
using FootballManagerApp.Players.Application.Common.DTOs;
using FootballManagerApp.Players.Application.Common.Interfaces;
using FootballManagerApp.Players.Application.Players.Handlers;
using FootballManagerApp.Players.Domain.Entities;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace FootballManagerApp.Players.Application.Tests.Handlers;

public class GetPlayerByIdHandlerTests
{
    [Fact]
    public async Task Returns_404_when_player_missing()
    {
        var repo = new Mock<IPlayerRepository>();
        repo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Player?)null);

        var sut = new GetPlayerByIdHandler(repo.Object,
            Mock.Of<ICommentsClient>(),
            NullLogger<GetPlayerByIdHandler>.Instance);

        var result = await sut.HandleAsync(Guid.NewGuid(), default);

        result.Status.Should().Be(404);
        result.Data.Should().BeNull();
    }

    [Fact]
    public async Task Returns_200_with_comments_when_player_exists()
    {
        var player = Player.Create("Pedri", "Barcelona", "La Liga", "u1");
        var repo = new Mock<IPlayerRepository>();
        repo.Setup(r => r.GetByIdAsync(player.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(player);

        var comments = new[] { new CommentDto(Guid.NewGuid(), "Johan", "Crack", 5, DateTime.UtcNow) };
        var client = new Mock<ICommentsClient>();
        client.Setup(c => c.GetByPlayerIdAsync(player.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(comments);

        var sut = new GetPlayerByIdHandler(repo.Object, client.Object,
            NullLogger<GetPlayerByIdHandler>.Instance);

        var result = await sut.HandleAsync(player.Id, default);

        result.Status.Should().Be(200);
        result.Data!.Comments.Should().HaveCount(1);
        result.Data!.Name.Should().Be("Pedri");
    }

    [Fact]
    public async Task Still_returns_200_when_comments_service_degraded()
    {
        var player = Player.Create("Pedri", "Barcelona", "La Liga", "u1");
        var repo = new Mock<IPlayerRepository>();
        repo.Setup(r => r.GetByIdAsync(player.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(player);

        // CommentsClient ya devuelve [] si el circuito está abierto
        var client = new Mock<ICommentsClient>();
        client.Setup(c => c.GetByPlayerIdAsync(player.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<CommentDto>());

        var sut = new GetPlayerByIdHandler(repo.Object, client.Object,
            NullLogger<GetPlayerByIdHandler>.Instance);

        var result = await sut.HandleAsync(player.Id, default);

        result.Status.Should().Be(200);
        result.Data!.Comments.Should().BeEmpty();
    }
}
