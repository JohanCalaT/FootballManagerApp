namespace FootballManagerApp.Gateway.Middleware;

/// <summary>
/// Normalizes and propagates identity / geolocation headers towards the
/// downstream backends. In Fase 1 the Gateway does NOT validate JWTs — it
/// trusts <c>X-User-Id</c> and <c>X-User-Admin</c> as they come from the
/// frontend. <c>Authorization</c> is stripped so backends never assume any
/// validation has happened upstream.
/// </summary>
// TODO: JWT Firebase validation — once enabled, this middleware should
//       translate the validated principal's claims into X-User-* headers
//       INSTEAD of trusting the incoming values.
public sealed class HeaderForwardingMiddleware
{
    public const string UserIdHeader = "X-User-Id";
    public const string UserAdminHeader = "X-User-Admin";

    private readonly RequestDelegate _next;

    public HeaderForwardingMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        var headers = context.Request.Headers;

        headers.Remove("Authorization");

        NormalizeUserId(headers);
        NormalizeUserAdmin(headers);

        await _next(context);
    }

    private static void NormalizeUserId(IHeaderDictionary headers)
    {
        if (!headers.TryGetValue(UserIdHeader, out var raw))
            return;

        var trimmed = raw.ToString().Trim();
        if (string.IsNullOrEmpty(trimmed))
            headers.Remove(UserIdHeader);
        else
            headers[UserIdHeader] = trimmed;
    }

    private static void NormalizeUserAdmin(IHeaderDictionary headers)
    {
        if (!headers.TryGetValue(UserAdminHeader, out var raw))
            return;

        var trimmed = raw.ToString().Trim();
        if (string.IsNullOrEmpty(trimmed))
        {
            headers.Remove(UserAdminHeader);
            return;
        }

        headers[UserAdminHeader] =
            string.Equals(trimmed, "true", StringComparison.OrdinalIgnoreCase)
                ? "true"
                : "false";
    }
}
