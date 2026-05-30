using FluentAssertions;
using FootballManagerApp.Players.Domain.Entities;
using FootballManagerApp.Shared.Exceptions;
using FootballManagerApp.Shared.Responses;
using FootballManagerApp.Shared.ValueObjects;

namespace FootballManagerApp.Players.Application.Tests;

public class BaselineTests
{
    [Fact]
    public void Player_Create_ShouldReturnValidPlayer()
    {
        var player = Player.Create("Pedri", "Barcelona", "La Liga", "uid-1");

        player.Id.Should().NotBeEmpty();
        player.Name.Should().Be("Pedri");
        player.Team.Should().Be("Barcelona");
        player.League.Should().Be("La Liga");
        player.CreatedByUserId.Should().Be("uid-1");
        player.RegisteredAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
        player.Statistics.Should().BeEmpty();
    }

    [Fact]
    public void Geolocation_Create_WithValidCoords_ShouldSucceed()
    {
        var geo = Geolocation.Create(40.4168m, -3.7038m, "Madrid", "España");

        geo.Lat.Should().Be(40.4168m);
        geo.Lng.Should().Be(-3.7038m);
        geo.City.Should().Be("Madrid");
        geo.Country.Should().Be("España");
    }

    [Fact]
    public void Geolocation_Create_WithInvalidLat_ShouldThrow()
    {
        var act = () => Geolocation.Create(91m, 0m);

        act.Should().Throw<DomainException>()
           .WithMessage("*Latitud*");
    }

    [Fact]
    public void ApiResponse_Success_ShouldHaveCorrectStatus()
    {
        var response = ApiResponse<string>.Success("hello");

        response.Status.Should().Be(200);
        response.Message.Should().Be("OK");
        response.Data.Should().Be("hello");
    }

    [Fact]
    public void ApiResponse_NotFound_ShouldReturn404()
    {
        var response = ApiResponse<string>.NotFound();

        response.Status.Should().Be(404);
        response.Data.Should().BeNull();
    }
}
