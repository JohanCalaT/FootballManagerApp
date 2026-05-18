using FluentAssertions;
using FootballManagerApp.Players.Application.Common.DTOs;
using FootballManagerApp.Players.Application.Common.Interfaces;
using FootballManagerApp.Players.Application.Players.Handlers;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace FootballManagerApp.Players.Application.Tests.Handlers;

public class SearchExternalPlayersHandlerTests
{
    private static List<ApiFootballProfileSummary> BuildProfiles(int count) =>
        Enumerable.Range(1, count)
            .Select(i => new ApiFootballProfileSummary(
                ApiFootballId: i,
                Name:          $"Player {i}",
                FirstName:     null, LastName: null, Nationality: null,
                BirthDate:     null, BirthPlace: null, BirthCountry: null,
                Height:        null, Weight: null, ShirtNumber: null,
                Position:      null, Photo: null))
            .ToList();

    [Fact]
    public async Task Slices_cached_list_for_requested_page()
    {
        var apiFootball = new Mock<IApiFootballService>();
        apiFootball.Setup(s => s.SearchProfilesAsync("messi", It.IsAny<CancellationToken>()))
            .ReturnsAsync(BuildProfiles(25));

        var sut = new SearchExternalPlayersHandler(apiFootball.Object,
            NullLogger<SearchExternalPlayersHandler>.Instance);

        var result = await sut.HandleAsync("messi", page: 2, limit: 10, default);

        result.Status.Should().Be(200);
        result.Total.Should().Be(25);
        result.Page.Should().Be(2);
        result.Limit.Should().Be(10);
        result.Pages.Should().Be(3);
        var data = result.Data.ToList();
        data.Should().HaveCount(10);
        data[0].ApiFootballId.Should().Be(11);
        data[9].ApiFootballId.Should().Be(20);
    }

    [Fact]
    public async Task Returns_empty_data_when_page_beyond_last()
    {
        var apiFootball = new Mock<IApiFootballService>();
        apiFootball.Setup(s => s.SearchProfilesAsync("messi", It.IsAny<CancellationToken>()))
            .ReturnsAsync(BuildProfiles(5));

        var sut = new SearchExternalPlayersHandler(apiFootball.Object,
            NullLogger<SearchExternalPlayersHandler>.Instance);

        var result = await sut.HandleAsync("messi", page: 99, limit: 10, default);

        result.Total.Should().Be(5);
        result.Pages.Should().Be(1);
        result.Data.Should().BeEmpty();
    }

    [Theory]
    [InlineData(0,   10,  1,  10)]
    [InlineData(-5,  10,  1,  10)]
    [InlineData(1,    0,  1,  10)]
    [InlineData(1, 1000,  1,  50)]
    public async Task Sanitises_page_and_limit(int page, int limit, int expPage, int expLimit)
    {
        var apiFootball = new Mock<IApiFootballService>();
        apiFootball.Setup(s => s.SearchProfilesAsync("messi", It.IsAny<CancellationToken>()))
            .ReturnsAsync(BuildProfiles(0));

        var sut = new SearchExternalPlayersHandler(apiFootball.Object,
            NullLogger<SearchExternalPlayersHandler>.Instance);

        var result = await sut.HandleAsync("messi", page, limit, default);

        result.Page.Should().Be(expPage);
        result.Limit.Should().Be(expLimit);
    }
}
