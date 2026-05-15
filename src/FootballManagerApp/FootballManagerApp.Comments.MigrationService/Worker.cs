using FootballManagerApp.Comments.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FootballManagerApp.Comments.MigrationService;

public class Worker(
    IServiceProvider serviceProvider,
    IHostApplicationLifetime lifetime,
    ILogger<Worker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            using var scope = serviceProvider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<CommentsDbContext>();

            var strategy = db.Database.CreateExecutionStrategy();
            await strategy.ExecuteAsync(async () =>
            {
                await db.Database.MigrateAsync(stoppingToken);
            });

            logger.LogInformation("CommentsDbContext migrations applied successfully.");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "An error occurred while applying CommentsDbContext migrations.");
            throw;
        }

        lifetime.StopApplication();
    }
}
