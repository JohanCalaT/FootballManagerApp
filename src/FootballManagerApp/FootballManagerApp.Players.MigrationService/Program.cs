using FootballManagerApp.Players.Infrastructure.Persistence;
using FootballManagerApp.Players.MigrationService;

var builder = Host.CreateApplicationBuilder(args);

builder.AddServiceDefaults();
builder.AddNpgsqlDbContext<PlayersDbContext>("playersdb");
builder.Services.AddHostedService<Worker>();

builder.Build().Run();
