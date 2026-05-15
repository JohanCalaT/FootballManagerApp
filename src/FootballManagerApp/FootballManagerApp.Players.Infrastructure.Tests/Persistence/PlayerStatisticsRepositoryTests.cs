using FluentAssertions;
using FootballManagerApp.Players.Domain.Entities;
using FootballManagerApp.Players.Infrastructure.Persistence.Repositories;

namespace FootballManagerApp.Players.Infrastructure.Tests.Persistence;

public class PlayerStatisticsRepositoryTests : IDisposable
{
    private readonly SqlitePlayersDbContextFactory _factory = new();

    public void Dispose() => _factory.Dispose();

    private async Task<Guid> SeedPlayerAsync()
    {
        var player = Player.Create("Test", "Team", "League", "uid");
        await using var ctx = _factory.CreateContext();
        await new PlayerRepository(ctx).CreateAsync(player, default);
        return player.Id;
    }

    [Fact]
    public async Task AddRangeAsync_persists_all_statistics()
    {
        var playerId = await SeedPlayerAsync();
        var stats = new[]
        {
            PlayerStatistics.Create(playerId, 2022, "Team", "League"),
            PlayerStatistics.Create(playerId, 2023, "Team", "League"),
            PlayerStatistics.Create(playerId, 2024, "Team", "League"),
        };

        await using (var ctx = _factory.CreateContext())
        {
            await new PlayerStatisticsRepository(ctx).AddRangeAsync(stats, default);
        }

        await using var read = _factory.CreateContext();
        read.PlayerStatistics.Should().HaveCount(3);
    }

    [Fact]
    public async Task GetByPlayerIdAsync_returns_statistics_ordered_by_season_desc()
    {
        var playerId = await SeedPlayerAsync();
        var stats = new[]
        {
            PlayerStatistics.Create(playerId, 2022, "T", "L"),
            PlayerStatistics.Create(playerId, 2024, "T", "L"),
            PlayerStatistics.Create(playerId, 2023, "T", "L"),
        };

        await using (var ctx = _factory.CreateContext())
        {
            await new PlayerStatisticsRepository(ctx).AddRangeAsync(stats, default);
        }

        await using var read = _factory.CreateContext();
        var result = (await new PlayerStatisticsRepository(read)
            .GetByPlayerIdAsync(playerId, default)).ToList();

        result.Should().HaveCount(3);
        result.Select(s => s.Season).Should().ContainInOrder(2024, 2023, 2022);
    }

    [Fact]
    public async Task GetByPlayerIdAsync_returns_empty_for_unknown_player()
    {
        await using var ctx = _factory.CreateContext();
        var result = await new PlayerStatisticsRepository(ctx)
            .GetByPlayerIdAsync(Guid.NewGuid(), default);
        result.Should().BeEmpty();
    }
}
