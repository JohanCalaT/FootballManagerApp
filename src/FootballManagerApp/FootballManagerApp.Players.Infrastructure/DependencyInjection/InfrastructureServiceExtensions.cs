using FootballManagerApp.Players.Application.Common.Interfaces;
using FootballManagerApp.Players.Application.IdealTeam.Handlers;
using FootballManagerApp.Players.Application.Players.Handlers;
using FootballManagerApp.Players.Infrastructure.Cache;
using FootballManagerApp.Players.Infrastructure.ExternalServices.ApiFootball;
using FootballManagerApp.Players.Infrastructure.ExternalServices.BlobStorage;
using FootballManagerApp.Players.Infrastructure.ExternalServices.Gemini;
using FootballManagerApp.Players.Infrastructure.Http;
using FootballManagerApp.Players.Infrastructure.Persistence.Repositories;
using Microsoft.Extensions.DependencyInjection;

namespace FootballManagerApp.Players.Infrastructure.DependencyInjection;

public static class InfrastructureServiceExtensions
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services)
    {
        // Repositorios
        services.AddScoped<IPlayerRepository, PlayerRepository>();
        services.AddScoped<IPlayerStatisticsRepository, PlayerStatisticsRepository>();

        // Servicios externos
        services.AddScoped<IBlobStorageService, BlobStorageService>();
        services.AddScoped<ICacheService, RedisCacheService>();
        services.AddHttpClient<IApiFootballService, ApiFootballService>();
        services.AddHttpClient<IGeminiService, GeminiService>();
        services.AddHttpClient<ICommentsClient, CommentsClient>();

        // Handlers — registrados desde Infrastructure por simplicidad de wiring
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
