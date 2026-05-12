using FluentAssertions;
using FootballManagerApp.Players.Application.Common;

namespace FootballManagerApp.Players.Application.Tests.Common;

public class PlayerMeasurementParserTests
{
    [Theory]
    [InlineData("188 cm", 188)]
    [InlineData("170 cm", 170)]
    [InlineData("  170 cm  ", 170)]
    [InlineData("170 CM", 170)]
    public void ParseHeightCm_WithValidInput_ShouldReturnValue(string raw, int expected)
    {
        PlayerMeasurementParser.ParseHeightCm(raw).Should().Be(expected);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("170")]
    [InlineData("170 kg")]
    [InlineData("abc cm")]
    [InlineData("-5 cm")]
    [InlineData("0 cm")]
    public void ParseHeightCm_WithInvalidInput_ShouldReturnNull(string? raw)
    {
        PlayerMeasurementParser.ParseHeightCm(raw).Should().BeNull();
    }

    [Theory]
    [InlineData("80 kg", 80)]
    [InlineData("67 kg", 67)]
    [InlineData("67 KG", 67)]
    public void ParseWeightKg_WithValidInput_ShouldReturnValue(string raw, int expected)
    {
        PlayerMeasurementParser.ParseWeightKg(raw).Should().Be(expected);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("80")]
    [InlineData("80 cm")]
    [InlineData("0 kg")]
    public void ParseWeightKg_WithInvalidInput_ShouldReturnNull(string? raw)
    {
        PlayerMeasurementParser.ParseWeightKg(raw).Should().BeNull();
    }
}
