using FootballManagerApp.Players.API.Middleware;
using FootballManagerApp.Players.Infrastructure.DependencyInjection;
using FootballManagerApp.Players.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddHealthChecks();

// Fase 1 baseline: placeholders in-memory.
// Fase 2: sustituir por Aspire -> AddNpgsqlDbContext("playersdb") y AddRedisDistributedCache("redis").
builder.Services.AddDbContext<PlayersDbContext>(opt =>
    opt.UseInMemoryDatabase("playersdb-dev"));
builder.Services.AddDistributedMemoryCache();

builder.Services.AddInfrastructure();

var app = builder.Build();

app.MapDefaultEndpoints();

app.UseMiddleware<ExceptionMiddleware>();

app.MapOpenApi();
app.MapScalarApiReference();

// Redirige la raíz a la documentación Scalar (mejor DX desde Aspire dashboard).
app.MapGet("/", () => Results.Redirect("/scalar/v1"))
   .ExcludeFromDescription();

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/health");

app.Run();
