using System.Net;
using FluentAssertions;
using FootballManagerApp.Players.Application.Common.ApiFootball;
using FootballManagerApp.Players.Infrastructure.ExternalServices.ApiFootball;
using Microsoft.Extensions.Logging.Abstractions;

namespace FootballManagerApp.Players.Infrastructure.Tests.ExternalServices.ApiFootball;

public class ApiFootballServiceTests
{
    private static ApiFootballService Build(
        StubHttpMessageHandler handler, InMemoryCacheService cache)
    {
        var http = new HttpClient(handler)
        {
            BaseAddress = new Uri("https://v3.football.api-sports.io/")
        };
        return new ApiFootballService(http, cache, NullLogger<ApiFootballService>.Instance);
    }

    // ─────────────────────────── SearchProfilesAsync ───────────────────────────

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("ab")]
    public async Task SearchProfilesAsync_throws_InvalidParameter_when_query_too_short(string query)
    {
        var handler = new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK));
        var sut = Build(handler, new InMemoryCacheService());

        var act = () => sut.SearchProfilesAsync(query, default);

        var ex = await act.Should().ThrowAsync<ApiFootballException>();
        ex.Which.Error.Should().BeOfType<ApiFootballError.InvalidParameter>();
        handler.Calls.Should().BeEmpty(); // no quemamos cuota
    }

    [Fact]
    public async Task SearchProfilesAsync_parses_profile_fixture()
    {
        var handler = StubHttpMessageHandler.FromFixture("profiles-search-messi.json");
        var sut = Build(handler, new InMemoryCacheService());

        var items = await sut.SearchProfilesAsync("Messi", default);

        items.Should().HaveCount(1);
        var p = items[0];
        p.ApiFootballId.Should().Be(154);
        p.Name.Should().Be("L. Messi");
        p.FirstName.Should().Be("Lionel Andrés");
        p.Nationality.Should().Be("Argentina");
        p.BirthDate.Should().Be("1987-06-24");
        p.Height.Should().Be("170 cm");
        p.Position.Should().Be("Attacker");
        p.ShirtNumber.Should().Be(10);
    }

    [Fact]
    public async Task SearchProfilesAsync_normalizes_query_for_cache_key()
    {
        var handler = StubHttpMessageHandler.FromFixture("profiles-search-messi.json");
        var cache = new InMemoryCacheService();
        var sut = Build(handler, cache);

        await sut.SearchProfilesAsync("  Messi  ", default);
        await sut.SearchProfilesAsync("MESSI",     default);
        await sut.SearchProfilesAsync("messi",     default);

        // Solo la primera llamada debe pegar al stub. Las otras 2 son cache hits.
        handler.Calls.Should().HaveCount(1);
        cache.HitCount.Should().Be(2);
    }

    [Fact]
    public async Task SearchProfilesAsync_caches_full_list_under_single_key_per_query()
    {
        var handler = StubHttpMessageHandler.FromFixture("profiles-search-messi.json");
        var cache = new InMemoryCacheService();
        var sut = Build(handler, cache);

        // Two consecutive calls for the same query hit API-Football once and
        // are then served from the same Redis key (no per-page suffix).
        await sut.SearchProfilesAsync("Messi", default);
        await sut.SearchProfilesAsync("Messi", default);

        handler.Calls.Should().HaveCount(1);
        cache.HitCount.Should().Be(1);
    }

    // ─────────────────────────── GetSeasonsAsync ───────────────────────────

    [Fact]
    public async Task GetSeasonsAsync_filters_to_2022_2023_2024_desc()
    {
        var handler = StubHttpMessageHandler.FromFixture("seasons-player-154.json");
        var sut = Build(handler, new InMemoryCacheService());

        var seasons = await sut.GetSeasonsAsync(154, default);

        seasons.Should().Equal(2024, 2023, 2022);
    }

    [Fact]
    public async Task GetSeasonsAsync_throws_InvalidParameter_when_id_le_zero()
    {
        var handler = new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK));
        var sut = Build(handler, new InMemoryCacheService());

        var act = () => sut.GetSeasonsAsync(0, default);

        await act.Should().ThrowAsync<ApiFootballException>()
            .Where(e => e.Error is ApiFootballError.InvalidParameter);
        handler.Calls.Should().BeEmpty();
    }

    // ─────────────────────────── GetPlayerImportDataAsync ───────────────────────────

    [Fact]
    public async Task GetPlayerImportDataAsync_parses_stats_fixture_with_typos()
    {
        var handler = StubHttpMessageHandler.FromFixture("stats-player-154-season-2022.json");
        var sut = Build(handler, new InMemoryCacheService());

        var data = await sut.GetPlayerImportDataAsync(154, 2022, default);

        data.Should().NotBeNull();
        data!.Profile.Name.Should().Be("L. Messi");
        data.Statistics.Should().HaveCount(2);

        var psg = data.Statistics[0];
        psg.TeamName.Should().Be("Paris Saint Germain");
        psg.LeagueName.Should().Be("Ligue 1");
        psg.Season.Should().Be(2022);
        psg.Appearances.Should().Be(32);   // typo "appearences" mapeado
        psg.Goals.Should().Be(16);
        psg.Assists.Should().Be(16);
        psg.Rating.Should().Be(8.10m);      // string "8.103125" → decimal 8.10
        psg.PenaltyMissed.Should().Be(0);   // typo "commited" → Committed
        psg.Captain.Should().BeFalse();

        var wc = data.Statistics[1];
        wc.TeamName.Should().Be("Argentina");
        wc.LeagueName.Should().Be("World Cup");
        wc.Captain.Should().BeTrue();
        wc.Rating.Should().Be(8.45m);
    }

    [Fact]
    public async Task GetPlayerImportDataAsync_returns_null_when_response_empty()
    {
        var handler = StubHttpMessageHandler.FromFixture("empty-response.json");
        var sut = Build(handler, new InMemoryCacheService());

        var data = await sut.GetPlayerImportDataAsync(154, 2022, default);

        data.Should().BeNull();
    }

    [Fact]
    public async Task GetPlayerImportDataAsync_throws_SeasonNotAvailable_for_invalid_season()
    {
        var handler = new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK));
        var sut = Build(handler, new InMemoryCacheService());

        var act = () => sut.GetPlayerImportDataAsync(154, 2021, default);

        await act.Should().ThrowAsync<ApiFootballException>()
            .Where(e => e.Error is ApiFootballError.SeasonNotAvailable);
        handler.Calls.Should().BeEmpty();
    }

    // ─────────────────────────── Errores en body (HTTP 200) ───────────────────────────

    [Fact]
    public async Task RateLimit_in_body_throws_RateLimited()
    {
        var handler = new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(
                StubHttpMessageHandler.LoadFixture("error-rate-limit-body.json"),
                System.Text.Encoding.UTF8, "application/json")
        });
        var sut = Build(handler, new InMemoryCacheService());

        var act = () => sut.SearchProfilesAsync("messi", default);

        await act.Should().ThrowAsync<ApiFootballException>()
            .Where(e => e.Error is ApiFootballError.RateLimited);
    }

    [Fact]
    public async Task MissingKey_in_body_throws_AuthenticationFailed()
    {
        var handler = new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(
                StubHttpMessageHandler.LoadFixture("error-missing-key-body.json"),
                System.Text.Encoding.UTF8, "application/json")
        });
        var sut = Build(handler, new InMemoryCacheService());

        var act = () => sut.GetPlayerImportDataAsync(154, 2022, default);

        await act.Should().ThrowAsync<ApiFootballException>()
            .Where(e => e.Error is ApiFootballError.AuthenticationFailed);
    }

    // ─────────────────────────── Errores HTTP ───────────────────────────

    [Fact]
    public async Task Http_401_throws_AuthenticationFailed()
    {
        var handler = StubHttpMessageHandler.FromStatusOnly(HttpStatusCode.Unauthorized);
        var sut = Build(handler, new InMemoryCacheService());

        await FluentActions.Invoking(() => sut.SearchProfilesAsync("messi", default))
            .Should().ThrowAsync<ApiFootballException>()
            .Where(e => e.Error is ApiFootballError.AuthenticationFailed);
    }

    [Fact]
    public async Task Http_429_throws_RateLimited()
    {
        var handler = StubHttpMessageHandler.FromStatusOnly(HttpStatusCode.TooManyRequests);
        var sut = Build(handler, new InMemoryCacheService());

        await FluentActions.Invoking(() => sut.SearchProfilesAsync("messi", default))
            .Should().ThrowAsync<ApiFootballException>()
            .Where(e => e.Error is ApiFootballError.RateLimited);
    }

    [Fact]
    public async Task Http_500_throws_UpstreamError()
    {
        var handler = StubHttpMessageHandler.FromStatusOnly(HttpStatusCode.InternalServerError);
        var sut = Build(handler, new InMemoryCacheService());

        await FluentActions.Invoking(() => sut.SearchProfilesAsync("messi", default))
            .Should().ThrowAsync<ApiFootballException>()
            .Where(e => e.Error is ApiFootballError.UpstreamError);
    }

    // ─────────────────────────── Cache hit ───────────────────────────

    [Fact]
    public async Task Stats_cache_hit_does_not_call_http()
    {
        var handler = StubHttpMessageHandler.FromFixture("stats-player-154-season-2022.json");
        var cache = new InMemoryCacheService();
        var sut = Build(handler, cache);

        await sut.GetPlayerImportDataAsync(154, 2022, default);
        await sut.GetPlayerImportDataAsync(154, 2022, default);
        await sut.GetPlayerImportDataAsync(154, 2022, default);

        handler.Calls.Should().HaveCount(1);
        cache.HitCount.Should().Be(2);
    }
}
