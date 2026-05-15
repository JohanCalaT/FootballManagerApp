using FluentAssertions;
using FootballManagerApp.Players.Application.Common.Interfaces;
using FootballManagerApp.Players.Application.Players.DTOs;
using FootballManagerApp.Players.Application.Players.Handlers;
using FootballManagerApp.Players.Application.Players.Validators;
using FootballManagerApp.Players.Domain.Entities;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace FootballManagerApp.Players.Application.Tests.Handlers;

public class CreatePlayerHandlerTests
{
    private static CreatePlayerHandler Build(Mock<IPlayerRepository> repo) =>
        new(repo.Object,
            new CreatePlayerValidator(),
            NullLogger<CreatePlayerHandler>.Instance);

    private static CreatePlayerDto Dto(string name = "Pedri", string position = "Midfielder") =>
        new(name, "Barcelona", "La Liga", position, null, null, null, null, null, 8,
            null, null, null, null, null);

    [Fact]
    public async Task Returns_401_when_userId_missing()
    {
        var repo = new Mock<IPlayerRepository>();
        var sut = Build(repo);

        var result = await sut.HandleAsync(Dto(), "", null, null, null, null, default);

        result.Status.Should().Be(401);
        repo.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Returns_400_when_validation_fails()
    {
        var repo = new Mock<IPlayerRepository>();
        var sut = Build(repo);

        var bad = new CreatePlayerDto("", "", "", "InvalidPosition", null, null, null, null, null, null,
            null, null, null, null, null);

        var result = await sut.HandleAsync(bad, "u1", null, null, null, null, default);

        result.Status.Should().Be(400);
        result.Message.Should().Contain("Name");
    }

    [Fact]
    public async Task Returns_201_and_persists_player_on_success()
    {
        var repo = new Mock<IPlayerRepository>();
        repo.Setup(r => r.CreateAsync(It.IsAny<Player>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Player p, CancellationToken _) => p);
        var sut = Build(repo);

        var result = await sut.HandleAsync(Dto(), "u1", 36.84m, -2.46m, "Almería", "Spain", default);

        result.Status.Should().Be(201);
        result.Data!.Name.Should().Be("Pedri");
        repo.Verify(r => r.CreateAsync(It.IsAny<Player>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task Returns_400_when_domain_validation_fails()
    {
        // Validator pasa (Name no vacío) pero Domain rechazará un Position no estándar.
        // Aquí forzamos error de dominio con un Lat fuera de rango (validator no aplica si es null).
        var repo = new Mock<IPlayerRepository>();
        var sut = Build(repo);

        // ClientLat inválido (no pasa por validator porque es header, no DTO) → domain throw
        var result = await sut.HandleAsync(Dto(), "u1", 95m, 0m, null, null, default);

        result.Status.Should().Be(400);
        result.Message.Should().Contain("Latitud");
    }
}
