using System.Threading.RateLimiting;
using FootballManagerApp.Comments.API.Middleware;
using FootballManagerApp.Comments.Infrastructure.DependencyInjection;
using FootballManagerApp.Comments.Infrastructure.Persistence;
using Microsoft.AspNetCore.RateLimiting;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

// Force TLS on the Npgsql connection string only when the target server
// is remote. Azure Database for PostgreSQL Flexible Server rejects
// plaintext, but the local Docker container Aspire spins up for dev does
// not have SSL enabled, so requesting it there breaks the connection.
builder.AddNpgsqlDbContext<CommentsDbContext>("commentsdb", configureSettings: s =>
{
    var csb = new Npgsql.NpgsqlConnectionStringBuilder(s.ConnectionString);
    if (!IsLocalHost(csb.Host))
    {
        csb.SslMode = Npgsql.SslMode.Require;
        s.ConnectionString = csb.ConnectionString;
    }
});

static bool IsLocalHost(string? host) =>
    string.IsNullOrEmpty(host)
    || string.Equals(host, "localhost", StringComparison.OrdinalIgnoreCase)
    || host == "127.0.0.1"
    || host == "::1";
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

// Namespace the OpenAPI spec + Scalar UI under /openapi/comments and
// /docs/comments so the YARP Gateway can multiplex Players and Comments
// docs without their default /openapi/v1.json paths colliding.
app.MapOpenApi("/openapi/comments/{documentName}.json");
app.MapScalarApiReference("/docs/comments/{documentName}", options =>
{
    options.OpenApiRoutePattern = "/openapi/comments/{documentName}.json";
});

app.MapGet("/", () => Results.Redirect("/docs/comments/v1"))
   .ExcludeFromDescription();

app.UseHttpsRedirection();

app.UseRateLimiter();
app.UseAuthorization();

app.MapControllers();

app.Run();

public partial class Program;
