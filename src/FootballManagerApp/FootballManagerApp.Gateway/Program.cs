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

// IMPORTANT: UseRouting must run AFTER BackendSelectorMiddleware so that YARP
// route matching sees the X-Backend-Target header stamped by the middleware.
// If UseRouting runs before, dynamic routes (matched by that header) never
// match and the proxy answers 404.
app.UseRouting();

app.MapDefaultEndpoints();
app.MapControllers();
app.MapReverseProxy();

app.Run();

public partial class Program;
