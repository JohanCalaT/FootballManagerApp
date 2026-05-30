using FootballManagerApp.Gateway.Extensions;
using FootballManagerApp.Gateway.Middleware;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"))
    .AddServiceDiscoveryDestinationResolver();
// NOTE: we deliberately do NOT preserve the original Host (no AddOriginalHost).
// Azure Container Apps' internal ingress routes by Host: forwarding the
// Gateway's public FQDN to an internal app makes ACA reply "Container App is
// stopped or does not exist" (404). YARP now sends the destination Host (so
// ACA routes correctly) plus X-Forwarded-Host/Proto by default — the
// downstream APIs honor those via UseForwardedHeaders so their absolute
// _links still point at the Gateway.

builder.Services.AddBackendStrategies();
builder.Services.AddControllers();
builder.Services.AddFirebaseAuth(builder.Configuration);

var app = builder.Build();

// Authentication must run BEFORE HeaderForwardingMiddleware so the
// middleware sees a populated ClaimsPrincipal and can stamp X-User-* from
// the validated claims. Authorization is registered but no [Authorize]
// attributes exist on the Gateway itself — downstream services gate on
// the forwarded headers.
app.UseAuthentication();
app.UseAuthorization();

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
