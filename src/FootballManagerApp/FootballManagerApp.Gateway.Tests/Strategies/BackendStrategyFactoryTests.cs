using FluentAssertions;
using FootballManagerApp.Gateway.Strategies;

namespace FootballManagerApp.Gateway.Tests.Strategies;

public class BackendStrategyFactoryTests
{
    private static BackendStrategyFactory NewFactory() =>
        new(new IBackendStrategy[] { new DotnetStrategy(), new NodeStrategy() });

    [Fact]
    public void DefaultStrategy_IsDotnet()
    {
        var factory = NewFactory();

        factory.GetActive().Name.Should().Be("dotnet");
    }

    [Fact]
    public void SetNode_ReturnsNodeStrategy()
    {
        var factory = NewFactory();

        var result = factory.SetActive("node");

        result.Name.Should().Be("node");
        factory.GetActive().Name.Should().Be("node");
    }

    [Fact]
    public void SetDotnet_ReturnsDotnetStrategy()
    {
        var factory = NewFactory();
        factory.SetActive("node");

        var result = factory.SetActive("dotnet");

        result.Name.Should().Be("dotnet");
        factory.GetActive().Name.Should().Be("dotnet");
    }

    [Fact]
    public void SetInvalid_ThrowsArgumentException()
    {
        var factory = NewFactory();

        var act = () => factory.SetActive("foo");

        act.Should().Throw<ArgumentException>()
            .WithMessage("*foo*");
    }

    [Fact]
    public void SetActive_IsThreadSafeUnderConcurrency()
    {
        var factory = NewFactory();
        var names = new[] { "dotnet", "node" };

        Parallel.For(0, 1_000, i => factory.SetActive(names[i % 2]));

        factory.GetActive().Name.Should().BeOneOf("dotnet", "node");
        factory.AvailableNames.Should().BeEquivalentTo("dotnet", "node");
    }
}
