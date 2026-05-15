using FootballManagerApp.Comments.Infrastructure.Persistence;
using FootballManagerApp.Comments.MigrationService;

var builder = Host.CreateApplicationBuilder(args);

builder.AddServiceDefaults();
builder.AddNpgsqlDbContext<CommentsDbContext>("commentsdb");
builder.Services.AddHostedService<Worker>();

builder.Build().Run();
