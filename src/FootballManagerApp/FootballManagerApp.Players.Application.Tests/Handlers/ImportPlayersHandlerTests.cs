using FluentAssertions;
using FootballManagerApp.Players.Application.Common.ApiFootball;
using FootballManagerApp.Players.Application.Common.DTOs;
using FootballManagerApp.Players.Application.Common.Interfaces;
using FootballManagerApp.Players.Application.Players.DTOs;
using FootballManagerApp.Players.Application.Players.Handlers;
using FootballManagerApp.Players.Domain.Entities;
using FootballManagerApp.Players.Domain.Exceptions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace FootballManagerApp.Players.Application.Tests.Handlers;

public class ImportPlayersHandlerTests
{
    private static ImportPlayersHandler Build(
        Mock<IApiFootballService> api, Mock<IPlayerRepository> repo) =>
        new(api.Object, repo.Object, NullLogger<ImportPlayersHandler>.Instance);

    private static ApiFootballImportData MessiPsg2022Data() =>
        new(
            Profile: new ApiFootballProfileSummary(
                ApiFootballId: 154, Name: "L. Messi",
                FirstName: "Lionel", LastName: "Messi", Nationality: "Argentina",
                BirthDate: "1987-06-24", BirthPlace: "Rosario", BirthCountry: "Argentina",
                Height: "170 cm", Weight: "67 kg", ShirtNumber: 10,
                Position: "Attacker", Photo: "https://media.api-sports.io/p/154.png"),
            Statistics: new List<ApiFootballStatLine>
            {
                new(Season: 2022, LeagueId: 61, LeagueName: "Ligue 1",
                    LeagueCountry: "France", LeagueLogo: null,
                    TeamId: 85, TeamName: "Paris Saint Germain", TeamLogo: null,
                    Appearances: 32, Lineups: 32, Minutes: 2842,
                    Position: "Attacker", Rating: 8.10m, Captain: false,
                    SubstitutesIn: 0, SubstitutesOut: 5, SubstitutesBench: 0,
                    ShotsTotal: 94, ShotsOn: 57,
                    Goals: 16, GoalsConceded: 0, GoalsSaves: null, Assists: 16,
                    PassesTotal: 1931, PassesKey: 95, PassesAccuracy: 50,
                    TacklesTotal: 26, TacklesBlocks: null, Interceptions: 2,
                    DuelsTotal: 338, DuelsWon: 165,
                    DribblesAttempts: 173, DribblesSuccess: 102,
                    FoulsDrawn: 36, FoulsCommitted: 8,
                    CardsYellow: 0, CardsYellowRed: 0, CardsRed: 0,
                    PenaltyScored: 0, PenaltyMissed: 0, PenaltySaved: null),
            });

    [Fact]
    public async Task Returns_401_when_userId_missing()
    {
        var api = new Mock<IApiFootballService>();
        var repo = new Mock<IPlayerRepository>();
        var sut = Build(api, repo);

        var result = await sut.HandleAsync(
            new[] { new ImportPlayerItemDto(154, 2022) }, "",
            null, null, null, null, default);

        result.Status.Should().Be(401);
        api.VerifyNoOtherCalls();
        repo.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Returns_400_when_items_empty()
    {
        var sut = Build(new(), new());
        var result = await sut.HandleAsync(
            Array.Empty<ImportPlayerItemDto>(), "u1",
            null, null, null, null, default);
        result.Status.Should().Be(400);
    }

    [Fact]
    public async Task Returns_400_when_season_invalid()
    {
        var api = new Mock<IApiFootballService>();
        var sut = Build(api, new());

        var result = await sut.HandleAsync(
            new[] { new ImportPlayerItemDto(154, 2019) }, "u1",
            null, null, null, null, default);

        result.Status.Should().Be(400);
        api.VerifyNoOtherCalls(); // no quema cuota
    }

    [Fact]
    public async Task Returns_409_when_already_imported()
    {
        var api = new Mock<IApiFootballService>();
        var repo = new Mock<IPlayerRepository>();
        repo.Setup(r => r.ExistsAsync(154, 2022, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        var sut = Build(api, repo);

        var result = await sut.HandleAsync(
            new[] { new ImportPlayerItemDto(154, 2022) }, "u1",
            null, null, null, null, default);

        result.Status.Should().Be(409);
        api.Verify(a => a.GetPlayerImportDataAsync(It.IsAny<int>(), It.IsAny<int>(),
            It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Returns_409_with_failed_item_when_api_returns_null()
    {
        var api = new Mock<IApiFootballService>();
        api.Setup(a => a.GetPlayerImportDataAsync(154, 2022, It.IsAny<CancellationToken>()))
            .ReturnsAsync((ApiFootballImportData?)null);
        var repo = new Mock<IPlayerRepository>();
        repo.Setup(r => r.ExistsAsync(It.IsAny<int>(), It.IsAny<int>(),
            It.IsAny<CancellationToken>())).ReturnsAsync(false);
        var sut = Build(api, repo);

        var result = await sut.HandleAsync(
            new[] { new ImportPlayerItemDto(154, 2022) }, "u1",
            null, null, null, null, default);

        result.Status.Should().Be(409);
        result.Data!.Imported.Should().BeEmpty();
        result.Data!.Failed.Should().ContainSingle()
            .Which.Reason.Should().Contain("sin datos");
    }

    [Fact]
    public async Task Returns_400_when_batch_exceeds_max_items()
    {
        var api = new Mock<IApiFootballService>();
        var repo = new Mock<IPlayerRepository>();
        var tooMany = Enumerable.Range(100, ImportPlayersHandler.MaxItemsPerBatch + 1)
            .Select(i => new ImportPlayerItemDto(i, 2024))
            .ToList();
        var sut = Build(api, repo);

        var result = await sut.HandleAsync(tooMany, "u1",
            null, null, null, null, default);

        result.Status.Should().Be(400);
        result.Message.Should().Contain("Máximo");
        api.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Returns_207_when_partial_success()
    {
        var api = new Mock<IApiFootballService>();
        api.Setup(a => a.GetPlayerImportDataAsync(154, 2022, It.IsAny<CancellationToken>()))
            .ReturnsAsync(MessiPsg2022Data());
        api.Setup(a => a.GetPlayerImportDataAsync(999, 2023, It.IsAny<CancellationToken>()))
            .ReturnsAsync((ApiFootballImportData?)null); // este falla

        var repo = new Mock<IPlayerRepository>();
        repo.Setup(r => r.ExistsAsync(It.IsAny<int>(), It.IsAny<int>(),
            It.IsAny<CancellationToken>())).ReturnsAsync(false);
        repo.Setup(r => r.CreateAsync(It.IsAny<Player>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Player p, CancellationToken _) => p);

        var sut = Build(api, repo);
        var result = await sut.HandleAsync(
            new[]
            {
                new ImportPlayerItemDto(154, 2022),
                new ImportPlayerItemDto(999, 2023),
            },
            "u1", null, null, null, null, default);

        result.Status.Should().Be(207);
        result.Data!.Imported.Should().HaveCount(1);
        result.Data!.Failed.Should().HaveCount(1);
    }

    [Fact]
    public async Task Aborts_remaining_items_when_rate_limited_mid_batch()
    {
        var api = new Mock<IApiFootballService>();
        api.Setup(a => a.GetPlayerImportDataAsync(1, 2022, It.IsAny<CancellationToken>()))
            .ReturnsAsync(MessiPsg2022Data());
        api.Setup(a => a.GetPlayerImportDataAsync(2, 2022, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ApiFootballException(new ApiFootballError.RateLimited()));
        // item 3 NO debería llamarse — abortado

        var repo = new Mock<IPlayerRepository>();
        repo.Setup(r => r.ExistsAsync(It.IsAny<int>(), It.IsAny<int>(),
            It.IsAny<CancellationToken>())).ReturnsAsync(false);
        repo.Setup(r => r.CreateAsync(It.IsAny<Player>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Player p, CancellationToken _) => p);

        var sut = Build(api, repo);
        var result = await sut.HandleAsync(
            new[]
            {
                new ImportPlayerItemDto(1, 2022),
                new ImportPlayerItemDto(2, 2022),
                new ImportPlayerItemDto(3, 2022),
            },
            "u1", null, null, null, null, default);

        result.Status.Should().Be(207); // 1 imported + 2 failed
        result.Data!.Imported.Should().HaveCount(1);
        result.Data!.Failed.Should().HaveCount(2);
        result.Data!.Failed.Last().Reason.Should().Contain("Skipped");

        api.Verify(a => a.GetPlayerImportDataAsync(3, 2022, It.IsAny<CancellationToken>()),
            Times.Never); // no quemamos cuota en el 3º
    }

    [Fact]
    public async Task Returns_201_and_persists_player_with_statistics()
    {
        var api = new Mock<IApiFootballService>();
        api.Setup(a => a.GetPlayerImportDataAsync(154, 2022, It.IsAny<CancellationToken>()))
            .ReturnsAsync(MessiPsg2022Data());
        var repo = new Mock<IPlayerRepository>();
        repo.Setup(r => r.ExistsAsync(154, 2022, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        Player? persisted = null;
        repo.Setup(r => r.CreateAsync(It.IsAny<Player>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Player p, CancellationToken _) => { persisted = p; return p; });

        var sut = Build(api, repo);
        var result = await sut.HandleAsync(
            new[] { new ImportPlayerItemDto(154, 2022) }, "u1",
            36.84m, -2.46m, "Almería", "España", default);

        result.Status.Should().Be(201);
        result.Data!.Imported.Should().ContainSingle(p => p.Name == "L. Messi");
        result.Data!.Failed.Should().BeEmpty();
        persisted.Should().NotBeNull();
        persisted!.ApiFootballId.Should().Be(154);
        persisted.Team.Should().Be("Paris Saint Germain");
        persisted.League.Should().Be("Ligue 1");
        persisted.Position.Should().Be("Attacker");
        persisted.ImageSource.Should().Be("api");
        persisted.Statistics.Should().HaveCount(1);
        persisted.Statistics.First().Goals.Should().Be(16);
        persisted.ClientGeolocation.Should().NotBeNull();
        persisted.ClientGeolocation!.City.Should().Be("Almería");
    }

    [Fact]
    public async Task Returns_409_when_repo_throws_PlayerAlreadyExistsException()
    {
        var api = new Mock<IApiFootballService>();
        api.Setup(a => a.GetPlayerImportDataAsync(154, 2022, It.IsAny<CancellationToken>()))
            .ReturnsAsync(MessiPsg2022Data());
        var repo = new Mock<IPlayerRepository>();
        repo.Setup(r => r.ExistsAsync(154, 2022, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false); // a la app le parece libre…
        repo.Setup(r => r.CreateAsync(It.IsAny<Player>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new PlayerAlreadyExistsException(154, 2022)); // …pero la BD dice 23505

        var sut = Build(api, repo);
        var result = await sut.HandleAsync(
            new[] { new ImportPlayerItemDto(154, 2022) }, "u1",
            null, null, null, null, default);

        result.Status.Should().Be(409);
    }

    [Theory]
    [InlineData(typeof(ApiFootballError.RateLimited),       503)]
    [InlineData(typeof(ApiFootballError.DailyQuotaExceeded), 503)]
    [InlineData(typeof(ApiFootballError.AuthenticationFailed), 500)]
    [InlineData(typeof(ApiFootballError.Timeout),           504)]
    public async Task Maps_ApiFootballError_to_correct_HTTP(Type errorType, int expectedStatus)
    {
        var error = (ApiFootballError)Activator.CreateInstance(errorType)!;
        var api = new Mock<IApiFootballService>();
        api.Setup(a => a.GetPlayerImportDataAsync(It.IsAny<int>(), It.IsAny<int>(),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ApiFootballException(error));
        var repo = new Mock<IPlayerRepository>();
        repo.Setup(r => r.ExistsAsync(It.IsAny<int>(), It.IsAny<int>(),
            It.IsAny<CancellationToken>())).ReturnsAsync(false);

        var sut = Build(api, repo);
        var result = await sut.HandleAsync(
            new[] { new ImportPlayerItemDto(154, 2022) }, "u1",
            null, null, null, null, default);

        result.Status.Should().Be(expectedStatus);
    }
}
