using FluentAssertions;
using FootballManagerApp.Gateway.Extensions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace FootballManagerApp.Gateway.Tests.Extensions;

public class AuthenticationExtensionsTests
{
    [Fact]
    public void AddFirebaseAuth_ReturnsServiceCollection_WithoutThrowing()
    {
        var services = new ServiceCollection();
        var config = new ConfigurationBuilder().Build();

        var act = () => services.AddFirebaseAuth(config);

        act.Should().NotThrow();
        act().Should().BeSameAs(services);
    }
}
