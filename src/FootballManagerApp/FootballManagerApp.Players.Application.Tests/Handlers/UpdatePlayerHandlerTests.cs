using FluentAssertions;
using FootballManagerApp.Players.Application.Common.Interfaces;
using FootballManagerApp.Players.Application.Players.DTOs;
using FootballManagerApp.Players.Application.Players.Handlers;
using FootballManagerApp.Players.Application.Players.Validators;
using FootballManagerApp.Players.Domain.Entities;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace FootballManagerApp.Players.Application.Tests.Handlers;

public class UpdatePlayerHandlerTests
{
    private static UpdatePlayerHandler Build(Mock<IPlayerRepository> repo) =>
        new(repo.Object, new UpdatePlayerValidator(),
            NullLogger<UpdatePlayerHandler>.Instance);

    private static UpdatePlayerDto Dto(string name = "Pedri González") =>
        new(name, "Barcelona", "La Liga", "Midfielder",
            ImageUrl: null, Nationality: null, BirthDate: null,
            Height: null, Weight: null, ShirtNumber: 8,
            PlayerLat: null, PlayerLng: null,
            PlayerCity: null, PlayerCountry: null);

    [Fact]
    public async Task Returns_400_when_dto_invalid()
    {
        var repo = new Mock<IPlayerRepository>();
        var bad = new UpdatePlayerDto("", "", "", Position: null,
            ImageUrl: null, Nationality: null, BirthDate: null,
            Height: null, Weight: null, ShirtNumber: null,
            PlayerLat: null, PlayerLng: null,
            PlayerCity: null, PlayerCountry: null);

        var result = await Build(repo).HandleAsync(Guid.NewGuid(), bad, null, default);

        result.Status.Should().Be(400);
        repo.Verify(r => r.UpdateAsync(It.IsAny<Player>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task Returns_404_when_player_missing()
    {
        var repo = new Mock<IPlayerRepository>();
        repo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Player?)null);

        var result = await Build(repo).HandleAsync(Guid.NewGuid(), Dto(), null, default);

        result.Status.Should().Be(404);
    }

    [Fact]
    public async Task Returns_412_when_if_match_version_mismatches()
    {
        var player = Player.Create("Pedri", "Barcelona", "La Liga", "u1");
        // Version starts at 0; cliente envía If-Match: 99 → mismatch.
        var repo = new Mock<IPlayerRepository>();
        repo.Setup(r => r.GetByIdAsync(player.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(player);

        var result = await Build(repo).HandleAsync(player.Id, Dto(), 99, default);

        result.Status.Should().Be(412);
        repo.Verify(r => r.UpdateAsync(It.IsAny<Player>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task Returns_200_and_persists_update()
    {
        var player = Player.Create("Pedri", "Barcelona", "La Liga", "u1");
        var repo = new Mock<IPlayerRepository>();
        repo.Setup(r => r.GetByIdAsync(player.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(player);

        var result = await Build(repo).HandleAsync(player.Id, Dto("Pedri G."), null, default);

        result.Status.Should().Be(200);
        result.Data!.Name.Should().Be("Pedri G.");
        repo.Verify(r => r.UpdateAsync(player, It.IsAny<CancellationToken>()), Times.Once);
    }
}
