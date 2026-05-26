using FootballManagerApp.Comments.Infrastructure.Persistence;
using FootballManagerApp.Comments.MigrationService;

var builder = Host.CreateApplicationBuilder(args);

builder.AddServiceDefaults();
builder.AddNpgsqlDbContext<CommentsDbContext>("commentsdb", configureSettings: s =>
{
    var csb = new Npgsql.NpgsqlConnectionStringBuilder(s.ConnectionString);
    if (!IsLocalHost(csb.Host))
    {
        csb.SslMode = Npgsql.SslMode.Require;
        s.ConnectionString = csb.ConnectionString;
    }
});
builder.Services.AddHostedService<Worker>();

builder.Build().Run();

static bool IsLocalHost(string? host) =>
    string.IsNullOrEmpty(host)
    || string.Equals(host, "localhost", StringComparison.OrdinalIgnoreCase)
    || host == "127.0.0.1"
    || host == "::1";
