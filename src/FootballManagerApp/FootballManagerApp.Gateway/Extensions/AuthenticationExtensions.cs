namespace FootballManagerApp.Gateway.Extensions;

/// <summary>
/// Scaffold for Firebase JWT validation. NOT wired in Fase 1 — kept here so
/// the future activation is a 3-line change in <c>Program.cs</c>:
/// <code>
///   builder.Services.AddFirebaseAuth(builder.Configuration);
///   app.UseAuthentication();
///   app.UseAuthorization();
/// </code>
/// </summary>
public static class AuthenticationExtensions
{
    // TODO: JWT Firebase validation
    //
    // Real implementation will:
    //   1. Read Firebase:ProjectId from configuration (Key Vault in cloud).
    //   2. AddAuthentication("Bearer").AddJwtBearer(options => {
    //        options.Authority = $"https://securetoken.google.com/{projectId}";
    //        options.TokenValidationParameters = new() {
    //          ValidateIssuer   = true,
    //          ValidIssuer      = $"https://securetoken.google.com/{projectId}",
    //          ValidateAudience = true,
    //          ValidAudience    = projectId,
    //          ValidateLifetime = true,
    //        };
    //        // OnTokenValidated → translate claims into X-User-Id / X-User-Admin
    //      });
    //   3. AddAuthorization with an "Admin" policy requiring claim "admin"="true".
    //
    // When activated, HeaderForwardingMiddleware must switch from "trust client
    // headers" mode to "write headers from validated principal" mode.
    public static IServiceCollection AddFirebaseAuth(
        this IServiceCollection services, IConfiguration configuration)
    {
        _ = configuration;
        return services;
    }
}
