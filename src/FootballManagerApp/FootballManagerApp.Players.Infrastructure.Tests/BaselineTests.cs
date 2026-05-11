using FluentAssertions;
using FootballManagerApp.Players.Infrastructure.DependencyInjection;

namespace FootballManagerApp.Players.Infrastructure.Tests;

public class BaselineTests
{
    [Fact]
    public void Baseline_Infrastructure_ShouldCompile()
    {
        // Sanity check: el ensamblado de Infrastructure carga
        // y tiene la clase de extensiones de DI esperada.
        var type = typeof(InfrastructureServiceExtensions);

        type.Should().NotBeNull();
        type.Name.Should().Be("InfrastructureServiceExtensions");
    }
}
