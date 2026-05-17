using FootballManagerApp.Gateway.Strategies;

namespace FootballManagerApp.Gateway.Middleware;

/// <summary>
/// Stamps an internal <c>X-Backend-Target</c> request header with the active
/// strategy name (<c>dotnet</c> or <c>node</c>) for routes that follow the
/// toggle. YARP route definitions match on this header to pick the right
/// cluster. Routes that ALWAYS go to .NET (search-external, seasons, import)
/// are not stamped — they match by path/method only because they depend on
/// API-Football integration that only lives in .NET.
/// </summary>
public sealed class BackendSelectorMiddleware
{
    public const string BackendTargetHeader = "X-Backend-Target";

    private static readonly (string Method, string Path)[] AlwaysDotnetPrefixes =
    {
        ("GET",  "/api/players/search-external"),
        ("GET",  "/api/players/seasons/"),
        ("POST", "/api/players/import"),
    };

    private readonly RequestDelegate _next;

    public BackendSelectorMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context, BackendStrategyFactory factory)
    {
        // Prevent header smuggling from the public internet.
        context.Request.Headers.Remove(BackendTargetHeader);

        var method = context.Request.Method;
        var path = context.Request.Path.Value ?? string.Empty;

        if (IsAlwaysDotnet(method, path))
        {
            await _next(context);
            return;
        }

        if (path.StartsWith("/api/players",    StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("/api/comments",   StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("/api/ideal-team", StringComparison.OrdinalIgnoreCase))
        {
            context.Request.Headers[BackendTargetHeader] = factory.GetActive().Name;
        }

        await _next(context);
    }

    private static bool IsAlwaysDotnet(string method, string path)
    {
        foreach (var (m, p) in AlwaysDotnetPrefixes)
        {
            if (!string.Equals(method, m, StringComparison.OrdinalIgnoreCase))
                continue;

            if (p.EndsWith('/'))
            {
                if (path.StartsWith(p, StringComparison.OrdinalIgnoreCase))
                    return true;
            }
            else if (string.Equals(path, p, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }
        return false;
    }
}
