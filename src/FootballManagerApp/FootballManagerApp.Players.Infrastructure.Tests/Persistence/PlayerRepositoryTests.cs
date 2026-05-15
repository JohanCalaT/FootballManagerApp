using FluentAssertions;
using FootballManagerApp.Players.Domain.Entities;
using FootballManagerApp.Players.Infrastructure.Persistence.Repositories;
using FootballManagerApp.Shared.ValueObjects;
using Microsoft.EntityFrameworkCore;

namespace FootballManagerApp.Players.Infrastructure.Tests.Persistence;

public class PlayerRepositoryTests : IDisposable
{
    private readonly SqlitePlayersDbContextFactory _factory = new();

    public void Dispose() => _factory.Dispose();

    private static Player NewPlayer(
        string name = "Lionel Messi",
        string team = "Inter Miami",
        string league = "MLS",
        string userId = "uid-1")
    {
        var p = Player.Create(name, team, league, userId);
        p.SetPersonalInfo("Lionel", "Messi", "Argentina", new DateTime(1987, 6, 24),
            "Rosario", "Argentina", "170 cm", "72 kg");
        p.SetFootballInfo("Attacker", 10);
        p.SetClientGeolocation(Geolocation.Create(36.834m, -2.464m, "Almería", "Spain"));
        return p;
    }

    [Fact]
    public async Task CreateAsync_persists_player_with_owned_geolocation()
    {
        var player = NewPlayer();
        await using (var ctx = _factory.CreateContext())
        {
            var repo = new PlayerRepository(ctx);
            await repo.CreateAsync(player, CancellationToken.None);
        }

        await using var read = _factory.CreateContext();
        var loaded = await read.Players.FindAsync(player.Id);

        loaded.Should().NotBeNull();
        loaded!.Name.Should().Be("Lionel Messi");
        loaded.ClientGeolocation.Should().NotBeNull();
        loaded.ClientGeolocation!.City.Should().Be("Almería");
    }

    [Fact]
    public async Task GetByIdAsync_includes_statistics()
    {
        var player = NewPlayer();
        var stats = PlayerStatistics.Create(player.Id, 2024, "Inter Miami", "MLS");
        stats.SetOffensive(40, 25, 18, 9, 5, 1);
        player.AddStatistics(stats);

        await using (var ctx = _factory.CreateContext())
        {
            await new PlayerRepository(ctx).CreateAsync(player, default);
        }

        await using var read = _factory.CreateContext();
        var loaded = await new PlayerRepository(read).GetByIdAsync(player.Id, default);

        loaded.Should().NotBeNull();
        loaded!.Statistics.Should().HaveCount(1);
        loaded.Statistics.Single().Goals.Should().Be(18);
    }

    [Fact]
    public async Task GetByIdAsync_returns_null_when_missing()
    {
        await using var ctx = _factory.CreateContext();
        var result = await new PlayerRepository(ctx).GetByIdAsync(Guid.NewGuid(), default);
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetAllAsync_paginates_and_orders_by_RegisteredAt_desc()
    {
        await using (var ctx = _factory.CreateContext())
        {
            var repo = new PlayerRepository(ctx);
            for (var i = 0; i < 5; i++)
            {
                await repo.CreateAsync(NewPlayer(name: $"Player {i}"), default);
                await Task.Delay(5); // ensure RegisteredAt differs
            }
        }

        await using var read = _factory.CreateContext();
        var (items, total) = await new PlayerRepository(read).GetAllAsync(1, 3, default);

        total.Should().Be(5);
        items.Should().HaveCount(3);
        items.Should().BeInDescendingOrder(p => p.RegisteredAt);
    }

    [Fact]
    public async Task UpdateAsync_persists_changes()
    {
        var player = NewPlayer();
        await using (var ctx = _factory.CreateContext())
        {
            await new PlayerRepository(ctx).CreateAsync(player, default);
        }

        await using (var ctx = _factory.CreateContext())
        {
            var loaded = await ctx.Players.FindAsync(player.Id);
            loaded!.Rename("Leo Messi");
            loaded.MarkInjured(true);
            await new PlayerRepository(ctx).UpdateAsync(loaded, default);
        }

        await using var read = _factory.CreateContext();
        var reloaded = await read.Players.FindAsync(player.Id);
        reloaded!.Name.Should().Be("Leo Messi");
        reloaded.Injured.Should().BeTrue();
    }

    [Fact]
    public async Task DeleteAsync_softdeletes_player_hiding_it_from_default_queries()
    {
        var player = NewPlayer();
        var stats = PlayerStatistics.Create(player.Id, 2023, "PSG", "Ligue 1");
        player.AddStatistics(stats);

        await using (var ctx = _factory.CreateContext())
        {
            await new PlayerRepository(ctx).CreateAsync(player, default);
        }

        await using (var ctx = _factory.CreateContext())
        {
            await new PlayerRepository(ctx).DeleteAsync(player.Id, default);
        }

        // El query filter HasQueryFilter(p => p.DeletedAt == null) lo oculta.
        await using var read = _factory.CreateContext();
        (await read.Players.FindAsync(player.Id)).Should().BeNull();

        // Pero la fila sigue físicamente — visible con IgnoreQueryFilters.
        var soft = await read.Players.IgnoreQueryFilters()
            .FirstOrDefaultAsync(p => p.Id == player.Id);
        soft.Should().NotBeNull();
        soft!.DeletedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task DeleteAsync_is_idempotent_when_id_missing()
    {
        await using var ctx = _factory.CreateContext();
        var act = async () =>
            await new PlayerRepository(ctx).DeleteAsync(Guid.NewGuid(), default);
        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task ExistsAsync_ignores_soft_deleted_players()
    {
        var player = NewPlayer();
        player.SetApiFootballId(154);
        player.AddStatistics(PlayerStatistics.Create(player.Id, 2024, "Inter Miami", "MLS"));

        await using (var ctx = _factory.CreateContext())
        {
            await new PlayerRepository(ctx).CreateAsync(player, default);
        }
        await using (var ctx = _factory.CreateContext())
        {
            await new PlayerRepository(ctx).DeleteAsync(player.Id, default);
        }

        await using var read = _factory.CreateContext();
        var exists = await new PlayerRepository(read).ExistsAsync(154, 2024, default);

        // El query filter HasQueryFilter oculta soft-deleted → ExistsAsync devuelve false.
        // Es lo que permite re-importar al mismo jugador tras borrarlo.
        exists.Should().BeFalse();
    }

    [Fact]
    public async Task FindIdByNameAndTeamAsync_ignores_soft_deleted()
    {
        var player = Player.Create("Pedri", "Barcelona", "La Liga", "u1");
        await using (var ctx = _factory.CreateContext())
        {
            await new PlayerRepository(ctx).CreateAsync(player, default);
        }
        await using (var ctx = _factory.CreateContext())
        {
            await new PlayerRepository(ctx).DeleteAsync(player.Id, default);
        }

        await using var read = _factory.CreateContext();
        var found = await new PlayerRepository(read)
            .FindIdByNameAndTeamAsync("Pedri", "Barcelona", default);

        // CreatePlayerHandler delegará en este resultado: null → no 409, crea nuevo.
        found.Should().BeNull();
    }

    [Fact]
    public async Task CreateAsync_after_soft_delete_succeeds_with_new_id()
    {
        var original = NewPlayer(name: "Pedri", team: "FC Barcelona");
        original.SetApiFootballId(909);

        await using (var ctx = _factory.CreateContext())
        {
            await new PlayerRepository(ctx).CreateAsync(original, default);
        }
        await using (var ctx = _factory.CreateContext())
        {
            await new PlayerRepository(ctx).DeleteAsync(original.Id, default);
        }

        // Mismo ApiFootballId + mismo Name+Team — debe insertarse sin chocar.
        var replacement = NewPlayer(name: "Pedri", team: "FC Barcelona");
        replacement.SetApiFootballId(909);

        await using (var ctx = _factory.CreateContext())
        {
            var act = async () => await new PlayerRepository(ctx)
                .CreateAsync(replacement, default);
            await act.Should().NotThrowAsync();
        }

        await using var read = _factory.CreateContext();
        var visible = await read.Players.Where(p => p.ApiFootballId == 909).ToListAsync();
        visible.Should().HaveCount(1); // solo el nuevo es visible
        visible[0].Id.Should().Be(replacement.Id);
    }

    [Fact]
    public async Task ExistsAsync_returns_true_when_api_football_id_and_season_match()
    {
        var player = NewPlayer();
        player.SetApiFootballId(154);
        var stats = PlayerStatistics.Create(player.Id, 2024, "Inter Miami", "MLS");
        player.AddStatistics(stats);

        await using (var ctx = _factory.CreateContext())
        {
            await new PlayerRepository(ctx).CreateAsync(player, default);
        }

        await using var read = _factory.CreateContext();
        var repo = new PlayerRepository(read);
        (await repo.ExistsAsync(154, 2024, default)).Should().BeTrue();
        (await repo.ExistsAsync(154, 2023, default)).Should().BeFalse();
        (await repo.ExistsAsync(999, 2024, default)).Should().BeFalse();
    }

    [Fact]
    public async Task FindIdByNameAndTeamAsync_matches_case_insensitive_with_trim()
    {
        var player = Player.Create("Pedri González", "FC Barcelona", "La Liga", "u1");
        await using (var ctx = _factory.CreateContext())
        {
            await new PlayerRepository(ctx).CreateAsync(player, default);
        }

        await using var read = _factory.CreateContext();
        var repo = new PlayerRepository(read);

        (await repo.FindIdByNameAndTeamAsync("  pedri gonzález  ", "fc barcelona", default))
            .Should().Be(player.Id);
        (await repo.FindIdByNameAndTeamAsync("PEDRI GONZÁLEZ", "FC BARCELONA", default))
            .Should().Be(player.Id);
    }

    [Fact]
    public async Task FindIdByNameAndTeamAsync_returns_null_when_team_differs()
    {
        var player = Player.Create("Pedri González", "FC Barcelona", "La Liga", "u1");
        await using (var ctx = _factory.CreateContext())
        {
            await new PlayerRepository(ctx).CreateAsync(player, default);
        }

        await using var read = _factory.CreateContext();
        var result = await new PlayerRepository(read)
            .FindIdByNameAndTeamAsync("Pedri González", "PSG", default);

        result.Should().BeNull();
    }

    [Fact]
    public async Task SearchAsync_filters_by_date_range()
    {
        // ILike de PostgreSQL no se traduce en SQLite — solo se ejercita el path de fechas.
        await using (var ctx = _factory.CreateContext())
        {
            var repo = new PlayerRepository(ctx);
            await repo.CreateAsync(NewPlayer(name: "Old"), default);
            await Task.Delay(20);
            await repo.CreateAsync(NewPlayer(name: "Recent"), default);
        }

        var cutoff = DateTime.UtcNow.AddMilliseconds(-10);

        await using var read = _factory.CreateContext();
        var (items, total) = await new PlayerRepository(read)
            .SearchAsync(null, null, null, cutoff, null, 1, 10, default);

        total.Should().Be(1);
        items.Single().Name.Should().Be("Recent");
    }
}
