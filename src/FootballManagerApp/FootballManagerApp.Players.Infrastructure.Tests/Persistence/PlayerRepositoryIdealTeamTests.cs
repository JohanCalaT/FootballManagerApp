using FluentAssertions;
using FootballManagerApp.Players.Domain.Entities;
using FootballManagerApp.Players.Infrastructure.Persistence.Repositories;

namespace FootballManagerApp.Players.Infrastructure.Tests.Persistence;

public class PlayerRepositoryIdealTeamTests : IDisposable
{
    private readonly SqlitePlayersDbContextFactory _factory = new();

    public void Dispose() => _factory.Dispose();

    private static Player NewPlayer(string name, string team, string position)
    {
        var p = Player.Create(name, team, "La Liga", "uid-1");
        p.SetFootballInfo(position, shirtNumber: null);
        return p;
    }

    private static PlayerStatistics NewStats(
        Guid playerId, int season, decimal? rating,
        int goals = 0, int assists = 0, int appearances = 0,
        int tackles = 0, int saves = 0)
    {
        var s = PlayerStatistics.Create(playerId, season, "Team", "League");
        s.SetGames(appearances, lineups: 0, minutesPlayed: 0,
            position: null, rating: rating, captain: false);
        s.SetOffensive(0, 0, goals, assists, 0, 0);
        s.SetDefensive(0, saves, 0, tackles, 0, 0);
        return s;
    }

    [Fact]
    public async Task GetAllForIdealTeam_AggregatesStatistics()
    {
        var pedri = NewPlayer("Pedri", "FC Barcelona", "Midfielder");
        pedri.AddStatistics(NewStats(pedri.Id, 2022, 7.5m, goals: 3, assists: 5, appearances: 30, tackles: 40));
        pedri.AddStatistics(NewStats(pedri.Id, 2023, 8.0m, goals: 5, assists: 7, appearances: 32, tackles: 50));

        await using (var ctx = _factory.CreateContext())
            await new PlayerRepository(ctx).CreateAsync(pedri, default);

        await using var read = _factory.CreateContext();
        var list = await new PlayerRepository(read)
            .GetAllForIdealTeamAsync(default);

        list.Should().HaveCount(1);
        var dto = list[0];
        // SQLite returns GUIDs as uppercase strings; Postgres as lowercase.
        // Compare as Guid to be DB-agnostic.
        Guid.Parse(dto.Id).Should().Be(pedri.Id);
        dto.Name.Should().Be("Pedri");
        dto.Team.Should().Be("FC Barcelona");
        dto.Position.Should().Be("Midfielder");
        dto.AverageRating.Should().Be(7.75m);
        dto.TotalGoals.Should().Be(8);
        dto.TotalAssists.Should().Be(12);
        dto.TotalAppearances.Should().Be(62);
        dto.TotalTackles.Should().Be(90);
        dto.HasStatistics.Should().BeTrue();
    }

    [Fact]
    public async Task GetAllForIdealTeam_PlayerWithoutStats_HasZeroSumsAndNullRating()
    {
        var rookie = NewPlayer("Rookie", "Almería B", "Defender");

        await using (var ctx = _factory.CreateContext())
            await new PlayerRepository(ctx).CreateAsync(rookie, default);

        await using var read = _factory.CreateContext();
        var dto = (await new PlayerRepository(read).GetAllForIdealTeamAsync(default))
            .Single();

        dto.AverageRating.Should().BeNull();
        dto.TotalGoals.Should().Be(0);
        dto.TotalAssists.Should().Be(0);
        dto.TotalAppearances.Should().Be(0);
        dto.HasStatistics.Should().BeFalse();
    }

    [Fact]
    public async Task GetAllForIdealTeam_AverageRating_IgnoresNullRatings()
    {
        var p = NewPlayer("Mixed", "X", "Attacker");
        p.AddStatistics(NewStats(p.Id, 2022, rating: null, goals: 1));
        p.AddStatistics(NewStats(p.Id, 2023, rating: 6.0m, goals: 2));
        p.AddStatistics(NewStats(p.Id, 2024, rating: 8.0m, goals: 3));

        await using (var ctx = _factory.CreateContext())
            await new PlayerRepository(ctx).CreateAsync(p, default);

        await using var read = _factory.CreateContext();
        var dto = (await new PlayerRepository(read).GetAllForIdealTeamAsync(default))
            .Single();

        // Avg of 6.0 and 8.0 (null ignored)
        dto.AverageRating.Should().Be(7.0m);
        dto.TotalGoals.Should().Be(6);
    }

    [Fact]
    public async Task GetAllForIdealTeam_DefaultsPositionToUnknown_WhenNull()
    {
        var p = Player.Create("NoPos", "Team", "Liga", "uid-1");
        // sin SetFootballInfo → Position queda null

        await using (var ctx = _factory.CreateContext())
            await new PlayerRepository(ctx).CreateAsync(p, default);

        await using var read = _factory.CreateContext();
        var dto = (await new PlayerRepository(read).GetAllForIdealTeamAsync(default))
            .Single();

        dto.Position.Should().Be("Unknown");
    }
}
