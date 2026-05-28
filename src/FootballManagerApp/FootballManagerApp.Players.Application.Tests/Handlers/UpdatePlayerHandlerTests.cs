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

    [Fact]
    public async Task Ignores_biographical_fields_on_imported_player()
    {
        // Imported players (ApiFootballId set) keep their identity locked
        // even if the caller tries to change Name / Nationality / BirthDate.
        // The fields that DO mutate (Team, Position, ShirtNumber, Height,
        // Weight, Injured) reflect the new values.
        var player = Player.Create("Lionel Messi", "Inter Miami", "MLS", "u1");
        player.SetApiFootballId(154);
        player.SetPersonalInfo(
            firstName: "Lionel", lastName: "Messi",
            nationality: "Argentina",
            birthDate: new DateTime(1987, 6, 24),
            birthPlace: "Rosario", birthCountry: "Argentina",
            height: "169 cm", weight: "67 kg");

        var repo = new Mock<IPlayerRepository>();
        repo.Setup(r => r.GetByIdAsync(player.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(player);

        var dto = new UpdatePlayerDto(
            Name: "TAMPERED",
            Team: "Al Nassr",
            League: "Saudi Pro",
            Position: "Attacker",
            ImageUrl: null,
            Nationality: "TAMPERED",
            BirthDate: new DateTime(2000, 1, 1),
            Height: "170 cm",
            Weight: "70 kg",
            ShirtNumber: 7,
            PlayerLat: null, PlayerLng: null,
            PlayerCity: null, PlayerCountry: null,
            FirstName: "TAMPERED",
            LastName: "TAMPERED",
            BirthPlace: "TAMPERED",
            BirthCountry: "TAMPERED",
            Injured: true);

        var result = await Build(repo).HandleAsync(player.Id, dto, null, default);

        result.Status.Should().Be(200);
        // Biographical / identity fields preserved
        player.Name.Should().Be("Lionel Messi");
        player.FirstName.Should().Be("Lionel");
        player.LastName.Should().Be("Messi");
        player.Nationality.Should().Be("Argentina");
        player.BirthDate.Should().Be(new DateTime(1987, 6, 24));
        player.BirthPlace.Should().Be("Rosario");
        player.BirthCountry.Should().Be("Argentina");
        // Mutable fields updated
        player.Team.Should().Be("Al Nassr");
        player.League.Should().Be("Saudi Pro");
        player.Position.Should().Be("Attacker");
        player.ShirtNumber.Should().Be(7);
        player.Height.Should().Be("170 cm");
        player.Weight.Should().Be("70 kg");
        player.Injured.Should().BeTrue();
    }

    [Fact]
    public async Task Allows_full_edit_on_manual_player()
    {
        // Manual players (no ApiFootballId) accept all changes.
        var player = Player.Create("Pedri", "Barcelona", "La Liga", "u1");
        var repo = new Mock<IPlayerRepository>();
        repo.Setup(r => r.GetByIdAsync(player.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(player);

        var dto = new UpdatePlayerDto(
            Name: "Pedri González",
            Team: "Barcelona",
            League: "La Liga",
            Position: "Midfielder",
            ImageUrl: null,
            Nationality: "España",
            BirthDate: new DateTime(2002, 11, 25),
            Height: "174 cm",
            Weight: "60 kg",
            ShirtNumber: 8,
            PlayerLat: null, PlayerLng: null,
            PlayerCity: null, PlayerCountry: null,
            FirstName: "Pedro",
            LastName: "González",
            BirthPlace: "Tegueste",
            BirthCountry: "España");

        var result = await Build(repo).HandleAsync(player.Id, dto, null, default);

        result.Status.Should().Be(200);
        player.Name.Should().Be("Pedri González");
        player.FirstName.Should().Be("Pedro");
        player.Nationality.Should().Be("España");
        player.BirthPlace.Should().Be("Tegueste");
    }

    [Fact]
    public async Task Reads_nested_geolocation_when_provided()
    {
        var player = Player.Create("Pedri", "Barcelona", "La Liga", "u1");
        var repo = new Mock<IPlayerRepository>();
        repo.Setup(r => r.GetByIdAsync(player.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(player);

        var dto = new UpdatePlayerDto(
            "Pedri", "Barcelona", "La Liga", "Midfielder",
            ImageUrl: null, Nationality: null, BirthDate: null,
            Height: null, Weight: null, ShirtNumber: null,
            // Legacy flat fields left null on purpose — nested should win.
            PlayerLat: null, PlayerLng: null,
            PlayerCity: null, PlayerCountry: null,
            PlayerGeolocation: new GeolocationDto(41.38m, 2.16m, "Barcelona", "España"));

        var result = await Build(repo).HandleAsync(player.Id, dto, null, default);

        result.Status.Should().Be(200);
        player.PlayerGeolocation.Should().NotBeNull();
        player.PlayerGeolocation!.Lat.Should().Be(41.38m);
        player.PlayerGeolocation.City.Should().Be("Barcelona");
    }
}
