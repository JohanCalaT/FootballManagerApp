using FluentValidation;
using FootballManagerApp.Players.Application.Common.Interfaces;
using FootballManagerApp.Players.Application.IdealTeam.Handlers;
using FootballManagerApp.Players.Application.Players.Handlers;
using FootballManagerApp.Players.Application.Players.Validators;
using FootballManagerApp.Players.Infrastructure.ExternalServices.ApiFootball;
using FootballManagerApp.Players.Infrastructure.ExternalServices.Gemini;
using FootballManagerApp.Players.Infrastructure.Http;
using FootballManagerApp.Players.Infrastructure.Persistence.Repositories;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Http.Resilience;
using Polly;

namespace FootballManagerApp.Players.Infrastructure.DependencyInjection;

public static class InfrastructureServiceExtensions
{
    // Aspire service discovery resolves this scheme://name to the Comments.API
    // endpoint when AppHost wires playersApi.WithReference(commentsApi).
    private const string CommentsServiceUri = "http://comments-api";

    public static IServiceCollection AddInfrastructure(this IServiceCollection services)
    {
        // Repositorios
        services.AddScoped<IPlayerRepository, PlayerRepository>();
        services.AddScoped<IPlayerStatisticsRepository, PlayerStatisticsRepository>();

        // ICacheService → se registra en Fase 2B con Redis + API-Football.

        // External HTTP clients — implementaciones reales en Fase 2B.
        services.AddHttpClient<IApiFootballService, ApiFootballService>();
        services.AddHttpClient<IGeminiService, GeminiService>();

        // Comments microservice — circuit breaker para 🏆 matrícula DWSC.
        services
            .AddHttpClient<ICommentsClient, CommentsClient>(client =>
            {
                client.BaseAddress = new Uri(CommentsServiceUri);
            })
            .AddResilienceHandler("comments-pipeline", builder =>
            {
                builder.AddRetry(new HttpRetryStrategyOptions
                {
                    MaxRetryAttempts = 3,
                    BackoffType = DelayBackoffType.Exponential,
                    UseJitter = true,
                    Delay = TimeSpan.FromMilliseconds(200),
                });
                builder.AddCircuitBreaker(new HttpCircuitBreakerStrategyOptions
                {
                    FailureRatio = 0.5,
                    MinimumThroughput = 10,
                    SamplingDuration = TimeSpan.FromSeconds(30),
                    BreakDuration = TimeSpan.FromSeconds(30),
                });
                builder.AddTimeout(TimeSpan.FromSeconds(10));
            });

        // Validators (FluentValidation)
        services.AddValidatorsFromAssemblyContaining<CreatePlayerValidator>();

        // Handlers — wiring centralizado.
        services.AddScoped<GetAllPlayersHandler>();
        services.AddScoped<GetPlayerByIdHandler>();
        services.AddScoped<SearchPlayersHandler>();
        services.AddScoped<CreatePlayerHandler>();
        services.AddScoped<ImportPlayersHandler>();
        services.AddScoped<UpdatePlayerHandler>();
        services.AddScoped<DeletePlayerHandler>();
        services.AddScoped<GenerateIdealTeamHandler>();

        return services;
    }
}
