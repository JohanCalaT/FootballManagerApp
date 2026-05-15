using FluentValidation;
using FootballManagerApp.Comments.Application.Common.Interfaces;
using FootballManagerApp.Comments.Application.Comments.Handlers;
using FootballManagerApp.Comments.Application.Comments.Validators;
using FootballManagerApp.Comments.Infrastructure.Persistence.Repositories;
using Microsoft.Extensions.DependencyInjection;

namespace FootballManagerApp.Comments.Infrastructure.DependencyInjection;

public static class InfrastructureServiceExtensions
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services)
    {
        // Repositorio
        services.AddScoped<ICommentRepository, CommentRepository>();

        // ICacheService → se registra en Fase 2B con Redis.

        // Validators (FluentValidation)
        services.AddValidatorsFromAssemblyContaining<CreateCommentValidator>();

        // Handlers
        services.AddScoped<GetCommentsByPlayerHandler>();
        services.AddScoped<CreateCommentHandler>();
        services.AddScoped<DeleteCommentHandler>();
        services.AddScoped<DeleteCommentsByPlayerHandler>();

        return services;
    }
}
