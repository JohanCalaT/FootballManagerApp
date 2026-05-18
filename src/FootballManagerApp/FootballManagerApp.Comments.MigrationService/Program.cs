using FootballManagerApp.Comments.Infrastructure.Persistence;
using FootballManagerApp.Comments.MigrationService;

var builder = Host.CreateApplicationBuilder(args);

builder.AddServiceDefaults();
builder.AddNpgsqlDbContext<CommentsDbContext>("commentsdb", configureSettings: s =>
{
    var csb = new Npgsql.NpgsqlConnectionStringBuilder(s.ConnectionString)
    {
        SslMode = Npgsql.SslMode.Require,
    };
    s.ConnectionString = csb.ConnectionString;
});
builder.Services.AddHostedService<Worker>();

builder.Build().Run();
