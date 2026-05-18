using FootballManagerApp.Players.Infrastructure.Persistence;
using FootballManagerApp.Players.MigrationService;

var builder = Host.CreateApplicationBuilder(args);

builder.AddServiceDefaults();
builder.AddNpgsqlDbContext<PlayersDbContext>("playersdb", configureSettings: s =>
{
    var csb = new Npgsql.NpgsqlConnectionStringBuilder(s.ConnectionString)
    {
        SslMode = Npgsql.SslMode.Require,
    };
    s.ConnectionString = csb.ConnectionString;
});
builder.Services.AddHostedService<Worker>();

builder.Build().Run();
