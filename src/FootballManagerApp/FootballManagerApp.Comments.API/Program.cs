using System.Threading.RateLimiting;
using FootballManagerApp.Comments.API.Middleware;
using FootballManagerApp.Comments.Infrastructure.DependencyInjection;
using FootballManagerApp.Comments.Infrastructure.Persistence;
using Microsoft.AspNetCore.RateLimiting;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

// Force TLS on the Npgsql connection string. Aspire's published Azure
// Postgres connection string omits SslMode, and Azure Database for
// PostgreSQL Flexible Server rejects plaintext with
// "no pg_hba.conf entry ... no encryption".
builder.AddNpgsqlDbContext<CommentsDbContext>("commentsdb", configureSettings: s =>
{
    var csb = new Npgsql.NpgsqlConnectionStringBuilder(s.ConnectionString)
    {
        SslMode = Npgsql.SslMode.Require,
    };
    s.ConnectionString = csb.ConnectionString;
});
builder.AddRedisDistributedCache("redis");

builder.Services.AddControllers();
builder.Services.AddOpenApi();

// Rate limit: 5 comentarios por minuto por usuario (X-User-Id) o IP.
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("create-comment", httpContext =>
    {
        var key = httpContext.Request.Headers["X-User-Id"].FirstOrDefault()
                  ?? httpContext.Connection.RemoteIpAddress?.ToString()
                  ?? "anon";
        return RateLimitPartition.GetFixedWindowLimiter(key, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 5,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
        });
    });
});

builder.Services.AddInfrastructure();

var app = builder.Build();

app.MapDefaultEndpoints();

app.UseMiddleware<ExceptionMiddleware>();

app.MapOpenApi();
app.MapScalarApiReference();

app.MapGet("/", () => Results.Redirect("/scalar/v1"))
   .ExcludeFromDescription();

app.UseHttpsRedirection();

app.UseRateLimiter();
app.UseAuthorization();

app.MapControllers();

app.Run();

public partial class Program;
