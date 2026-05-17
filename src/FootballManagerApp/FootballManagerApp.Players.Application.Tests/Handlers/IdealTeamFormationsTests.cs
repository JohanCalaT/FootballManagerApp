using FluentAssertions;
using FootballManagerApp.Players.Application.IdealTeam;

namespace FootballManagerApp.Players.Application.Tests.Handlers;

public class IdealTeamFormationsTests
{
    [Fact]
    public void All_ShouldContainExactlyFifteenFormations()
    {
        IdealTeamFormations.All.Should().HaveCount(15);
    }

    [Theory]
    [InlineData("4-3-3")]
    [InlineData("WM")]
    [InlineData("2-3-2-3")]
    [InlineData("4-2-4")]
    public void IsValid_WithKnownFormation_ReturnsTrue(string formation)
    {
        IdealTeamFormations.IsValid(formation).Should().BeTrue();
    }

    [Theory]
    [InlineData("9-9-9")]
    [InlineData("")]
    [InlineData(null)]
    [InlineData(" 4-3-3 ")]
    public void IsValid_WithUnknownOrEmpty_ReturnsFalse(string? formation)
    {
        IdealTeamFormations.IsValid(formation).Should().BeFalse();
    }

    [Fact]
    public void Joined_ContainsAllFormationsCommaSeparated()
    {
        IdealTeamFormations.Joined.Should().Contain("4-3-3").And.Contain("WM");
        IdealTeamFormations.Joined.Split(", ").Should().HaveCount(15);
    }
}
