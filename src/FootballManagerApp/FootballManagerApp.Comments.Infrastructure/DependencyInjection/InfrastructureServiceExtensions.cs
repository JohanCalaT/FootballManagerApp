using FootballManagerApp.Comments.Application.Common.Interfaces;
using FootballManagerApp.Comments.Application.Comments.Handlers;
using FootballManagerApp.Comments.Infrastructure.Cache;
using FootballManagerApp.Comments.Infrastructure.Persistence.Repositories;
using Microsoft.Extensions.DependencyInjection;

namespace FootballManagerApp.Comments.Infrastructure.DependencyInjection;

public static class InfrastructureServiceExtensions
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services)
    {
        // Repositorio
        services.AddScoped<ICommentRepository, CommentRepository>();

        // Cache
        services.AddScoped<ICacheService, RedisCacheService>();

        // Handlers
        services.AddScoped<GetCommentsByPlayerHandler>();
        services.AddScoped<CreateCommentHandler>();
        services.AddScoped<DeleteCommentHandler>();

        return services;
    }
}
