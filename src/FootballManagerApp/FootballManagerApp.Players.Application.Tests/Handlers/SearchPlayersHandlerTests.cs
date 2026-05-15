using FluentAssertions;
using FootballManagerApp.Players.Application.Common.Interfaces;
using FootballManagerApp.Players.Application.Players.Handlers;
using FootballManagerApp.Players.Domain.Entities;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace FootballManagerApp.Players.Application.Tests.Handlers;

public class SearchPlayersHandlerTests
{
    [Fact]
    public async Task Returns_paged_response_passing_filters_to_repo()
    {
        var repo = new Mock<IPlayerRepository>();
        var players = new[] { Player.Create("Pedri", "Barcelona", "La Liga", "u1") };
        repo.Setup(r => r.SearchAsync(
                "Pedri", "Barcelona", "La Liga",
                null, null, 1, 10, It.IsAny<CancellationToken>()))
            .ReturnsAsync((players.AsEnumerable(), 1));

        var sut = new SearchPlayersHandler(repo.Object,
            NullLogger<SearchPlayersHandler>.Instance);

        var result = await sut.HandleAsync(
            "Pedri", "Barcelona", "La Liga", null, null, 1, 10, default);

        result.Status.Should().Be(200);
        result.Total.Should().Be(1);
        result.Data.Should().ContainSingle(p => p.Name == "Pedri");
    }
}
