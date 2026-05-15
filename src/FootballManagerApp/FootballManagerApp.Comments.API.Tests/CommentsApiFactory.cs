using FootballManagerApp.Comments.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace FootballManagerApp.Comments.API.Tests;

public sealed class CommentsApiFactory : WebApplicationFactory<Program>
{
    private readonly SqliteConnection _connection;

    public CommentsApiFactory()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("ConnectionStrings:commentsdb",
            "Host=localhost;Database=ignored;Username=t;Password=t");

        builder.ConfigureServices(services =>
        {
            var efDescriptors = services
                .Where(d => d.ServiceType.FullName?.StartsWith(
                    "Microsoft.EntityFrameworkCore") == true
                         || d.ServiceType == typeof(CommentsDbContext)
                         || d.ServiceType == typeof(DbContextOptions<CommentsDbContext>)
                         || d.ServiceType == typeof(DbContextOptions))
                .ToList();
            foreach (var d in efDescriptors) services.Remove(d);

            services.AddDbContext<CommentsDbContext>(opts => opts.UseSqlite(_connection));

            using var scope = services.BuildServiceProvider().CreateScope();
            scope.ServiceProvider.GetRequiredService<CommentsDbContext>()
                 .Database.EnsureCreated();
        });
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing) _connection.Dispose();
        base.Dispose(disposing);
    }
}
