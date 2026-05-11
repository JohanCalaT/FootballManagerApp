using FluentAssertions;
using FootballManagerApp.Comments.Infrastructure.DependencyInjection;

namespace FootballManagerApp.Comments.Infrastructure.Tests;

public class BaselineTests
{
    [Fact]
    public void Baseline_Infrastructure_ShouldCompile()
    {
        var type = typeof(InfrastructureServiceExtensions);

        type.Should().NotBeNull();
        type.Name.Should().Be("InfrastructureServiceExtensions");
    }
}
