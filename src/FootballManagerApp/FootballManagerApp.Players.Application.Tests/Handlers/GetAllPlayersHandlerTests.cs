using FluentAssertions;
using FootballManagerApp.Players.Application.Common.Interfaces;
using FootballManagerApp.Players.Application.Players.Handlers;
using FootballManagerApp.Players.Domain.Entities;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace FootballManagerApp.Players.Application.Tests.Handlers;

public class GetAllPlayersHandlerTests
{
    [Fact]
    public async Task Returns_paged_response_with_mapped_dtos()
    {
        var players = new[]
        {
            Player.Create("Pedri", "Barcelona", "La Liga", "u1"),
            Player.Create("Vinicius", "Real Madrid", "La Liga", "u1"),
        };
        var repo = new Mock<IPlayerRepository>();
        repo.Setup(r => r.GetAllAsync(1, 10, It.IsAny<CancellationToken>()))
            .ReturnsAsync((players.AsEnumerable(), 2));

        var sut = new GetAllPlayersHandler(repo.Object,
            NullLogger<GetAllPlayersHandler>.Instance);

        var result = await sut.HandleAsync(1, 10, default);

        result.Status.Should().Be(200);
        result.Total.Should().Be(2);
        result.Data.Should().HaveCount(2);
        result.Pages.Should().Be(1);
    }

    [Theory]
    [InlineData(0, 10, 1, 10)]
    [InlineData(-5, 10, 1, 10)]
    [InlineData(1, 0, 1, 10)]
    [InlineData(1, 500, 1, 100)]
    public async Task Sanitises_page_and_limit(int page, int limit, int expPage, int expLimit)
    {
        var repo = new Mock<IPlayerRepository>();
        repo.Setup(r => r.GetAllAsync(expPage, expLimit, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Array.Empty<Player>().AsEnumerable(), 0));

        var sut = new GetAllPlayersHandler(repo.Object,
            NullLogger<GetAllPlayersHandler>.Instance);

        await sut.HandleAsync(page, limit, default);

        repo.Verify(r => r.GetAllAsync(expPage, expLimit, It.IsAny<CancellationToken>()),
            Times.Once);
    }
}
