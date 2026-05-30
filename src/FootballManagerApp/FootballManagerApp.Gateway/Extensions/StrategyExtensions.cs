using FootballManagerApp.Gateway.Strategies;

namespace FootballManagerApp.Gateway.Extensions;

public static class StrategyExtensions
{
    public static IServiceCollection AddBackendStrategies(this IServiceCollection services)
    {
        services.AddSingleton<IBackendStrategy, DotnetStrategy>();
        services.AddSingleton<IBackendStrategy, NodeStrategy>();
        services.AddSingleton<BackendStrategyFactory>();
        return services;
    }
}
