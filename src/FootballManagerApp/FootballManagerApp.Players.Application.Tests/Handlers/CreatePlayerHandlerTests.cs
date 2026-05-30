using FluentAssertions;
using FootballManagerApp.Players.Application.Common.DTOs;
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
        new(name, "Barcelona", "La Liga", position,
            ImageUrl: null, ImageSource: null,
            Nationality: null, BirthDate: null,
            Height: null, Weight: null, ShirtNumber: 8,
            PlayerLat: null, PlayerLng: null,
            PlayerCity: null, PlayerCountry: null,
            Statistics: null);

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

        var bad = new CreatePlayerDto("", "", "", "InvalidPosition",
            ImageUrl: null, ImageSource: null,
            Nationality: null, BirthDate: null,
            Height: null, Weight: null, ShirtNumber: null,
            PlayerLat: null, PlayerLng: null,
            PlayerCity: null, PlayerCountry: null,
            Statistics: null);

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
    public async Task Returns_409_when_player_with_same_name_and_team_exists()
    {
        var existingId = Guid.NewGuid();
        var repo = new Mock<IPlayerRepository>();
        repo.Setup(r => r.FindIdByNameAndTeamAsync("Pedri", "Barcelona",
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingId);
        var sut = Build(repo);

        var result = await sut.HandleAsync(Dto(), "u1", null, null, null, null, default);

        result.Status.Should().Be(409);
        result.Message.Should().Contain(existingId.ToString());
        repo.Verify(r => r.CreateAsync(It.IsAny<Player>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task Returns_400_when_statistics_have_duplicates()
    {
        var repo = new Mock<IPlayerRepository>();
        var dupStats = new PlayerStatisticsDto[]
        {
            new(2024, "Barcelona", "La Liga", 10, 3, 2, 7.5m),
            new(2024, " barcelona ", "LA LIGA", 5, 1, 0, 7.0m),
        };
        var dto = new CreatePlayerDto("Pedri", "Barcelona", "La Liga", "Midfielder",
            ImageUrl: null, ImageSource: null,
            Nationality: null, BirthDate: null,
            Height: null, Weight: null, ShirtNumber: 8,
            PlayerLat: null, PlayerLng: null,
            PlayerCity: null, PlayerCountry: null,
            Statistics: dupStats);

        var result = await Build(repo).HandleAsync(dto, "u1", null, null, null, null, default);

        result.Status.Should().Be(400);
        result.Message.Should().Contain("Statistics duplicadas");
        repo.Verify(r => r.CreateAsync(It.IsAny<Player>(), It.IsAny<CancellationToken>()),
            Times.Never);
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
