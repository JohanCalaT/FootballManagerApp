using System.Security.Claims;

namespace FootballManagerApp.Gateway.Middleware;

/// <summary>
/// Translates the validated Firebase principal into trusted identity headers
/// for downstream microservices.
///
/// Rules:
/// <list type="bullet">
///   <item>Any incoming <c>X-User-Id</c> / <c>X-User-Admin</c> is stripped —
///         the Gateway is the only source of truth.</item>
///   <item>If the request carries a <c>Bearer</c> token that failed
///         validation, respond 401 (silent acceptance would let bad tokens
///         pass through as anonymous).</item>
///   <item>If the principal is authenticated, stamp <c>X-User-Id</c> from
///         the <c>user_id</c>/<c>sub</c> claim and <c>X-User-Admin</c> from
///         the <c>admin</c> custom claim.</item>
///   <item>The raw <c>Authorization</c> header is stripped before forwarding
///         so backends never see the JWT.</item>
/// </list>
/// </summary>
public sealed class HeaderForwardingMiddleware
{
    public const string UserIdHeader = "X-User-Id";
    public const string UserAdminHeader = "X-User-Admin";

    private readonly RequestDelegate _next;

    public HeaderForwardingMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        var headers = context.Request.Headers;

        // Untrusted: strip whatever the client tried to send.
        headers.Remove(UserIdHeader);
        headers.Remove(UserAdminHeader);

        var hasBearer = HasBearerToken(headers);
        var isAuthenticated = context.User.Identity?.IsAuthenticated == true;

        if (hasBearer && !isAuthenticated)
        {
            // Token supplied but rejected by the JwtBearer handler — refuse
            // to forward as anonymous so a bad token never silently downgrades.
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return;
        }

        if (isAuthenticated)
        {
            var uid = context.User.FindFirstValue("user_id")
                      ?? context.User.FindFirstValue("sub")
                      ?? context.User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (!string.IsNullOrEmpty(uid))
            {
                headers[UserIdHeader] = uid;
            }

            var adminClaim = context.User.FindFirstValue("admin");
            if (string.Equals(adminClaim, "true", StringComparison.OrdinalIgnoreCase))
            {
                headers[UserAdminHeader] = "true";
            }
        }

        // Never forward the raw token — downstream trusts X-User-* only.
        headers.Remove("Authorization");

        await _next(context);
    }

    private static bool HasBearerToken(IHeaderDictionary headers)
    {
        if (!headers.TryGetValue("Authorization", out var values))
        {
            return false;
        }

        foreach (var value in values)
        {
            if (value is null)
            {
                continue;
            }
            if (value.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase) &&
                value.Length > "Bearer ".Length)
            {
                return true;
            }
        }
        return false;
    }
}
