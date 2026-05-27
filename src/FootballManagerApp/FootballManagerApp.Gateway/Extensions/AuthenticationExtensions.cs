using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

namespace FootballManagerApp.Gateway.Extensions;

/// <summary>
/// Wires Firebase ID token validation on the Gateway. Downstream
/// microservices never see raw tokens — they trust the
/// <c>X-User-Id</c> / <c>X-User-Admin</c> headers stamped by
/// <see cref="Middleware.HeaderForwardingMiddleware"/> from the validated
/// principal. See CLAUDE.md ("Validar JWT en microservicios — Gateway lo hace").
/// </summary>
public static class AuthenticationExtensions
{
    public static IServiceCollection AddFirebaseAuth(
        this IServiceCollection services, IConfiguration configuration)
    {
        var projectId = configuration["Firebase:ProjectId"];
        if (string.IsNullOrWhiteSpace(projectId))
        {
            // Anonymous-only mode (smoke tests, local without AppHost). The
            // gateway still works but Authorization headers are ignored.
            return services;
        }

        var issuer = $"https://securetoken.google.com/{projectId}";

        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                // Authority triggers OIDC discovery at
                // {issuer}/.well-known/openid-configuration which exposes the
                // JWKS URI — no need to hardcode Google's signing-key endpoint.
                options.Authority = issuer;
                options.RequireHttpsMetadata = true;

                // Preserve original claim names (user_id, admin, …). Without
                // this, sub gets remapped to ClaimTypes.NameIdentifier and the
                // header forwarder cannot find user_id.
                options.MapInboundClaims = false;

                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = issuer,
                    ValidateAudience = true,
                    ValidAudience = projectId,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    NameClaimType = "user_id",
                };
            });

        services.AddAuthorization();
        return services;
    }
}
