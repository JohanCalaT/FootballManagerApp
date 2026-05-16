using FootballManagerApp.Gateway.Extensions;
using FootballManagerApp.Gateway.Middleware;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"))
    .AddServiceDiscoveryDestinationResolver();

builder.Services.AddBackendStrategies();
builder.Services.AddControllers();

// TODO: JWT Firebase validation — activar cuando se implemente
// builder.Services.AddFirebaseAuth(builder.Configuration);

var app = builder.Build();

// TODO: JWT Firebase validation
// app.UseAuthentication();
// app.UseAuthorization();

app.UseMiddleware<UpstreamErrorResponseMiddleware>();
app.UseMiddleware<HeaderForwardingMiddleware>();
app.UseMiddleware<BackendSelectorMiddleware>();

app.MapDefaultEndpoints();
app.MapControllers();
app.MapReverseProxy();

app.Run();

public partial class Program;
