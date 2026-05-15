using FootballManagerApp.Players.API.Middleware;
using FootballManagerApp.Players.Infrastructure.DependencyInjection;
using FootballManagerApp.Players.Infrastructure.Persistence;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

builder.AddNpgsqlDbContext<PlayersDbContext>("playersdb");

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
