using System.Text.Json;
using FluentAssertions;
using FootballManagerApp.Players.Application.Common.Exceptions;
using FootballManagerApp.Players.Application.Common.Interfaces;
using FootballManagerApp.Players.Application.IdealTeam.DTOs;
using FootballManagerApp.Players.Application.IdealTeam.Handlers;
using FootballManagerApp.Players.Application.Players.DTOs;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace FootballManagerApp.Players.Application.Tests.Handlers;

public class GenerateIdealTeamHandlerTests
{
    private static PlayerForPromptDto P(string position, string id, string name = "X")
        => new()
        {
            Id = id,
            Name = name,
            Team = "T",
            Position = position,
            AverageRating = 7.0m,
            TotalGoals = 1,
            TotalAssists = 1,
            TotalAppearances = 10,
            TotalTackles = 5,
            TotalSaves = 0,
            HasStatistics = true,
        };

    private static List<PlayerForPromptDto> ElevenPlayersFor433()
    {
        var list = new List<PlayerForPromptDto>
        {
            P("Goalkeeper", Guid.NewGuid().ToString(), "GK1"),
            P("Defender",   Guid.NewGuid().ToString(), "D1"),
            P("Defender",   Guid.NewGuid().ToString(), "D2"),
            P("Defender",   Guid.NewGuid().ToString(), "D3"),
            P("Defender",   Guid.NewGuid().ToString(), "D4"),
            P("Midfielder", Guid.NewGuid().ToString(), "M1"),
            P("Midfielder", Guid.NewGuid().ToString(), "M2"),
            P("Midfielder", Guid.NewGuid().ToString(), "M3"),
            P("Attacker",   Guid.NewGuid().ToString(), "A1"),
            P("Attacker",   Guid.NewGuid().ToString(), "A2"),
            P("Attacker",   Guid.NewGuid().ToString(), "A3"),
        };
        return list;
    }

    private static string FakeGeminiResponse(IReadOnlyList<PlayerForPromptDto> players)
    {
        var gk   = players.First(p => p.Position == "Goalkeeper");
        var defs = players.Where(p => p.Position == "Defender").ToList();
        var mids = players.Where(p => p.Position == "Midfielder").ToList();
        var atts = players.Where(p => p.Position == "Attacker").ToList();

        var dto = new IdealTeamResponseDto(
            "4-3-3",
            new IdealTeamPlayerDto(Guid.Parse(gk.Id), gk.Name, gk.Team, "GK", 0.5m, 0.05m, "best gk"),
            defs.Select(d => new IdealTeamPlayerDto(Guid.Parse(d.Id), d.Name, d.Team, "CB", 0.4m, 0.2m, "r")).ToList(),
            mids.Select(m => new IdealTeamPlayerDto(Guid.Parse(m.Id), m.Name, m.Team, "CM", 0.5m, 0.5m, "r")).ToList(),
            atts.Select(a => new IdealTeamPlayerDto(Guid.Parse(a.Id), a.Name, a.Team, "ST", 0.5m, 0.8m, "r")).ToList(),
            "good team");
        return JsonSerializer.Serialize(dto);
    }

    private static GenerateIdealTeamHandler Build(
        Mock<IPlayerRepository> repo,
        Mock<IGeminiService> gemini)
        => new(repo.Object, gemini.Object,
            NullLogger<GenerateIdealTeamHandler>.Instance);

    [Fact]
    public async Task Returns_400_when_formation_invalid()
    {
        var sut = Build(new Mock<IPlayerRepository>(), new Mock<IGeminiService>());

        var r = await sut.HandleAsync(new GenerateIdealTeamDto("9-9-9"), "u", default);

        r.Status.Should().Be(400);
        r.Message.Should().Contain("Formación inválida");
    }

    [Fact]
    public async Task Returns_400_when_less_than_eleven_players()
    {
        var repo = new Mock<IPlayerRepository>();
        repo.Setup(r => r.GetAllForIdealTeamAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<PlayerForPromptDto> { P("Goalkeeper", Guid.NewGuid().ToString()) });

        var r = await Build(repo, new Mock<IGeminiService>())
            .HandleAsync(new GenerateIdealTeamDto("4-3-3"), "u", default);

        r.Status.Should().Be(400);
        r.Message.Should().Contain("mínimo 11");
    }

    [Fact]
    public async Task Returns_400_when_no_goalkeeper()
    {
        var players = ElevenPlayersFor433();
        players.RemoveAll(p => p.Position == "Goalkeeper");
        // Add an extra Defender so total is still 11
        players.Add(P("Defender", Guid.NewGuid().ToString()));

        var repo = new Mock<IPlayerRepository>();
        repo.Setup(r => r.GetAllForIdealTeamAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(players);

        var r = await Build(repo, new Mock<IGeminiService>())
            .HandleAsync(new GenerateIdealTeamDto("4-3-3"), "u", default);

        r.Status.Should().Be(400);
        r.Message.Should().Be("No hay porteros disponibles");
    }

    [Fact]
    public async Task Returns_200_with_self_link_when_gemini_responds_validly()
    {
        var players = ElevenPlayersFor433();
        var repo = new Mock<IPlayerRepository>();
        repo.Setup(r => r.GetAllForIdealTeamAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(players);

        var gemini = new Mock<IGeminiService>();
        gemini.Setup(g => g.GenerateIdealTeamAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(FakeGeminiResponse(players));

        var r = await Build(repo, gemini).HandleAsync(
            new GenerateIdealTeamDto("4-3-3"), "u", default);

        r.Status.Should().Be(200);
        r.Message.Should().Be("Equipo Ideal generado correctamente");
        r.Data.Should().NotBeNull();
        r.Data!.Formation.Should().Be("4-3-3");
        r.Data.Defenders.Should().HaveCount(4);
        r.Data.Midfielders.Should().HaveCount(3);
        r.Data.Attackers.Should().HaveCount(3);
        r.Links.Should().ContainKey("self");
        r.Links["self"].Method.Should().Be("POST");
    }

    [Fact]
    public async Task Throws_GeminiUnavailable_when_response_is_malformed_json()
    {
        var players = ElevenPlayersFor433();
        var repo = new Mock<IPlayerRepository>();
        repo.Setup(r => r.GetAllForIdealTeamAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(players);

        var gemini = new Mock<IGeminiService>();
        gemini.Setup(g => g.GenerateIdealTeamAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("not-json");

        await Build(repo, gemini).Invoking(s => s.HandleAsync(
            new GenerateIdealTeamDto("4-3-3"), "u", default))
            .Should().ThrowAsync<GeminiUnavailableException>();
    }

    [Fact]
    public async Task Throws_GeminiUnavailable_when_id_not_in_database()
    {
        var players = ElevenPlayersFor433();
        var repo = new Mock<IPlayerRepository>();
        repo.Setup(r => r.GetAllForIdealTeamAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(players);

        // Inject an unknown id into the response
        var rogue = ElevenPlayersFor433();
        var gemini = new Mock<IGeminiService>();
        gemini.Setup(g => g.GenerateIdealTeamAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(FakeGeminiResponse(rogue));  // distinct GUIDs

        await Build(repo, gemini).Invoking(s => s.HandleAsync(
            new GenerateIdealTeamDto("4-3-3"), "u", default))
            .Should().ThrowAsync<GeminiUnavailableException>()
            .WithMessage("*unknown player id*");
    }
}
