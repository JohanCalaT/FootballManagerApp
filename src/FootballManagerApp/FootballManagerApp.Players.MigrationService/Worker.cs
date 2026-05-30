using FootballManagerApp.Players.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FootballManagerApp.Players.MigrationService;

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
            var db = scope.ServiceProvider.GetRequiredService<PlayersDbContext>();

            var strategy = db.Database.CreateExecutionStrategy();
            await strategy.ExecuteAsync(async () =>
            {
                await db.Database.MigrateAsync(stoppingToken);
            });

            logger.LogInformation("PlayersDbContext migrations applied successfully.");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "An error occurred while applying PlayersDbContext migrations.");
            throw;
        }

        lifetime.StopApplication();
    }
}
