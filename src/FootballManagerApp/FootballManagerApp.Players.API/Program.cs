using FootballManagerApp.Players.API.Middleware;
using FootballManagerApp.Players.Infrastructure.DependencyInjection;
using FootballManagerApp.Players.Infrastructure.Persistence;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

// Force TLS on the Npgsql connection string only when the target server
// is remote. Azure Database for PostgreSQL Flexible Server rejects
// plaintext, but the local Docker container Aspire spins up for dev does
// not have SSL enabled, so requesting it there breaks the connection.
builder.AddNpgsqlDbContext<PlayersDbContext>("playersdb", configureSettings: s =>
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

builder.Services.AddInfrastructure();

var app = builder.Build();

app.MapDefaultEndpoints();

app.UseMiddleware<ExceptionMiddleware>();

// Namespace the OpenAPI spec + Scalar UI under /openapi/players and
// /docs/players so the YARP Gateway can multiplex Players and Comments
// docs without their default /openapi/v1.json paths colliding.
app.MapOpenApi("/openapi/players/{documentName}.json");
app.MapScalarApiReference("/docs/players/{documentName}", options =>
{
    options.OpenApiRoutePattern = "/openapi/players/{documentName}.json";
});

app.MapGet("/", () => Results.Redirect("/docs/players/v1"))
   .ExcludeFromDescription();

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();

// Exposed for WebApplicationFactory<Program> in integration tests.
public partial class Program;
