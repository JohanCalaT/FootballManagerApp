using FootballManagerApp.Players.API.Middleware;
using FootballManagerApp.Players.Infrastructure.DependencyInjection;
using FootballManagerApp.Players.Infrastructure.Persistence;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

// Force TLS on the Npgsql connection string. Aspire's published Azure
// Postgres connection string omits SslMode, and Azure Database for
// PostgreSQL Flexible Server rejects plaintext with
// "no pg_hba.conf entry ... no encryption".
builder.AddNpgsqlDbContext<PlayersDbContext>("playersdb", configureSettings: s =>
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

builder.Services.AddInfrastructure();

var app = builder.Build();

app.MapDefaultEndpoints();

app.UseMiddleware<ExceptionMiddleware>();

app.MapOpenApi();
app.MapScalarApiReference();

app.MapGet("/", () => Results.Redirect("/scalar/v1"))
   .ExcludeFromDescription();

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();

// Exposed for WebApplicationFactory<Program> in integration tests.
public partial class Program;
