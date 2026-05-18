using FluentValidation;
using FootballManagerApp.Players.Application.Common.Interfaces;
using FootballManagerApp.Players.Application.IdealTeam.Handlers;
using FootballManagerApp.Players.Application.Players.Handlers;
using FootballManagerApp.Players.Application.Players.Validators;
using FootballManagerApp.Players.Infrastructure.Cache;
using FootballManagerApp.Players.Infrastructure.ExternalServices.ApiFootball;
using FootballManagerApp.Players.Infrastructure.ExternalServices.Gemini;
using FootballManagerApp.Players.Infrastructure.Http;
using FootballManagerApp.Players.Infrastructure.Persistence.Repositories;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Http.Resilience;
using Polly;
using Polly.RateLimiting;
using System.Threading.RateLimiting;

namespace FootballManagerApp.Players.Infrastructure.DependencyInjection;

public static class InfrastructureServiceExtensions
{
    // Aspire service discovery resolves these scheme://name to the actual endpoints
    // when AppHost wires playersApi.WithReference(commentsApi).
    private const string CommentsServiceUri  = "http://comments-api";
    private const string ApiFootballBaseUrl  = "https://v3.football.api-sports.io/";

    public static IServiceCollection AddInfrastructure(this IServiceCollection services)
    {
        // Repositorios
        services.AddScoped<IPlayerRepository, PlayerRepository>();
        services.AddScoped<IPlayerStatisticsRepository, PlayerStatisticsRepository>();

        // Cache distribuido (Redis vía Aspire). Si Redis no está registrado en
        // Program.cs, RedisCacheService no se resolverá y los handlers que
        // dependan de ICacheService fallarán explícitamente — es lo correcto.
        services.AddScoped<ICacheService, RedisCacheService>();

        // Gemini: HttpClient tipado con Polly resilience (retry + circuit breaker
        // + per-attempt timeout). Sin rate-limiter — la cuota de Gemini se
        // negocia por proyecto y no es por minuto como API-Football.
        services
            .AddHttpClient<IGeminiService, GeminiService>()
            .AddResilienceHandler("gemini-pipeline", pipeline =>
            {
                pipeline.AddRetry(new HttpRetryStrategyOptions
                {
                    ShouldHandle = new Polly.PredicateBuilder<HttpResponseMessage>()
                        .HandleResult(r =>
                            r.StatusCode == System.Net.HttpStatusCode.TooManyRequests ||
                            (int)r.StatusCode >= 500),
                    MaxRetryAttempts = 2,
                    BackoffType = DelayBackoffType.Exponential,
                    UseJitter = true,
                    Delay = TimeSpan.FromSeconds(1),
                });
                pipeline.AddCircuitBreaker(new HttpCircuitBreakerStrategyOptions
                {
                    FailureRatio = 0.5,
                    MinimumThroughput = 5,
                    SamplingDuration = TimeSpan.FromSeconds(60),
                    BreakDuration = TimeSpan.FromSeconds(30),
                });
                // Per-attempt timeout — el HttpClient.Timeout total ya lo
                // configura GeminiService desde Gemini:TimeoutSeconds.
                pipeline.AddTimeout(TimeSpan.FromSeconds(30));
            });

        // API-Football: HttpClient tipado con auth header + Polly resilience.
        services
            .AddHttpClient<IApiFootballService, ApiFootballService>((sp, client) =>
            {
                client.BaseAddress = new Uri(ApiFootballBaseUrl);
                client.Timeout = TimeSpan.FromSeconds(15);

                var config = sp.GetRequiredService<IConfiguration>();
                var apiKey = config["ApiFootball:ApiKey"]
                    ?? throw new InvalidOperationException(
                        "ApiFootball:ApiKey no configurada. " +
                        "Define el user-secret 'Parameters:ApiFootballKey' en el AppHost.");
                client.DefaultRequestHeaders.Add("x-apisports-key", apiKey);
            })
            .AddResilienceHandler("api-football", pipeline =>
            {
                // Rate-limit aplicación-wide: alinea con el plan free (10/min).
                // Si excedemos, Polly tira RateLimiterRejectedException → SendAsync
                // lo mapea a ApiFootballError.RateLimited (→ 503 al cliente).
                pipeline.AddRateLimiter(new TokenBucketRateLimiter(
                    new TokenBucketRateLimiterOptions
                    {
                        TokenLimit = 10,
                        TokensPerPeriod = 10,
                        ReplenishmentPeriod = TimeSpan.FromMinutes(1),
                        QueueLimit = 0,
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        AutoReplenishment = true,
                    }));

                pipeline.AddRetry(new HttpRetryStrategyOptions
                {
                    ShouldHandle = new Polly.PredicateBuilder<HttpResponseMessage>()
                        .HandleResult(r =>
                            r.StatusCode == System.Net.HttpStatusCode.TooManyRequests ||
                            (int)r.StatusCode >= 500),
                    MaxRetryAttempts = 3,
                    BackoffType = DelayBackoffType.Exponential,
                    UseJitter = true,
                    Delay = TimeSpan.FromSeconds(1),
                });
                pipeline.AddCircuitBreaker(new HttpCircuitBreakerStrategyOptions
                {
                    FailureRatio = 0.5,
                    MinimumThroughput = 10,
                    SamplingDuration = TimeSpan.FromSeconds(60),
                    BreakDuration = TimeSpan.FromMinutes(1),
                });
                pipeline.AddTimeout(TimeSpan.FromSeconds(10));
            });

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
        services.AddScoped<SearchExternalPlayersHandler>();
        services.AddScoped<CreatePlayerHandler>();
        services.AddScoped<ImportPlayersHandler>();
        services.AddScoped<UpdatePlayerHandler>();
        services.AddScoped<DeletePlayerHandler>();
        services.AddScoped<GenerateIdealTeamHandler>();

        return services;
    }
}
