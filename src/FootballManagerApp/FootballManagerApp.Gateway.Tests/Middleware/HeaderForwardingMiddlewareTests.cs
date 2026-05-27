using System.Security.Claims;
using FluentAssertions;
using FootballManagerApp.Gateway.Middleware;
using Microsoft.AspNetCore.Http;

namespace FootballManagerApp.Gateway.Tests.Middleware;

public class HeaderForwardingMiddlewareTests
{
    private static (HeaderForwardingMiddleware mw, HttpContext ctx) Build(
        ClaimsPrincipal? user = null)
    {
        var mw = new HeaderForwardingMiddleware(_ => Task.CompletedTask);
        var ctx = new DefaultHttpContext();
        if (user is not null)
        {
            ctx.User = user;
        }
        return (mw, ctx);
    }

    private static ClaimsPrincipal AuthenticatedUser(string uid, bool isAdmin = false)
    {
        var claims = new List<Claim> { new("user_id", uid) };
        if (isAdmin)
        {
            claims.Add(new Claim("admin", "true"));
        }
        var identity = new ClaimsIdentity(claims, authenticationType: "TestBearer");
        return new ClaimsPrincipal(identity);
    }

    [Fact]
    public async Task Anonymous_NoTokenSupplied_StampsNoIdentityHeaders()
    {
        var (mw, ctx) = Build();

        await mw.InvokeAsync(ctx);

        ctx.Request.Headers.ContainsKey(HeaderForwardingMiddleware.UserIdHeader)
            .Should().BeFalse();
        ctx.Request.Headers.ContainsKey(HeaderForwardingMiddleware.UserAdminHeader)
            .Should().BeFalse();
        ctx.Response.StatusCode.Should().Be(StatusCodes.Status200OK);
    }

    [Fact]
    public async Task AuthenticatedUser_StampsXUserIdFromClaim()
    {
        var (mw, ctx) = Build(AuthenticatedUser("firebase-uid-123"));

        await mw.InvokeAsync(ctx);

        ctx.Request.Headers[HeaderForwardingMiddleware.UserIdHeader]
            .ToString().Should().Be("firebase-uid-123");
    }

    [Fact]
    public async Task AuthenticatedUser_FallsBackToSubClaim()
    {
        var identity = new ClaimsIdentity(
            [new Claim("sub", "uid-from-sub")],
            authenticationType: "TestBearer");
        var (mw, ctx) = Build(new ClaimsPrincipal(identity));

        await mw.InvokeAsync(ctx);

        ctx.Request.Headers[HeaderForwardingMiddleware.UserIdHeader]
            .ToString().Should().Be("uid-from-sub");
    }

    [Fact]
    public async Task NonAdminUser_DoesNotStampAdminHeader()
    {
        var (mw, ctx) = Build(AuthenticatedUser("uid-42", isAdmin: false));

        await mw.InvokeAsync(ctx);

        ctx.Request.Headers.ContainsKey(HeaderForwardingMiddleware.UserAdminHeader)
            .Should().BeFalse();
    }

    [Fact]
    public async Task AdminUser_StampsAdminHeaderTrue()
    {
        var (mw, ctx) = Build(AuthenticatedUser("uid-42", isAdmin: true));

        await mw.InvokeAsync(ctx);

        ctx.Request.Headers[HeaderForwardingMiddleware.UserAdminHeader]
            .ToString().Should().Be("true");
    }

    [Fact]
    public async Task ClientSuppliedXUserId_IsStripped_EvenWhenAnonymous()
    {
        var (mw, ctx) = Build();
        ctx.Request.Headers[HeaderForwardingMiddleware.UserIdHeader] = "spoofed-uid";
        ctx.Request.Headers[HeaderForwardingMiddleware.UserAdminHeader] = "true";

        await mw.InvokeAsync(ctx);

        ctx.Request.Headers.ContainsKey(HeaderForwardingMiddleware.UserIdHeader)
            .Should().BeFalse();
        ctx.Request.Headers.ContainsKey(HeaderForwardingMiddleware.UserAdminHeader)
            .Should().BeFalse();
    }

    [Fact]
    public async Task ClientSuppliedXUserAdmin_IsOverwrittenByClaim()
    {
        // The client lies and says it is admin, but the JWT claim says otherwise.
        var (mw, ctx) = Build(AuthenticatedUser("uid-1", isAdmin: false));
        ctx.Request.Headers[HeaderForwardingMiddleware.UserAdminHeader] = "true";

        await mw.InvokeAsync(ctx);

        ctx.Request.Headers.ContainsKey(HeaderForwardingMiddleware.UserAdminHeader)
            .Should().BeFalse();
    }

    [Fact]
    public async Task BearerToken_WithoutValidPrincipal_ReturnsUnauthorized()
    {
        var (mw, ctx) = Build();
        ctx.Request.Headers["Authorization"] = "Bearer eyJ.invalid.token";

        await mw.InvokeAsync(ctx);

        ctx.Response.StatusCode.Should().Be(StatusCodes.Status401Unauthorized);
        ctx.Request.Headers.ContainsKey(HeaderForwardingMiddleware.UserIdHeader)
            .Should().BeFalse();
    }

    [Fact]
    public async Task Authorization_IsStrippedBeforeForward()
    {
        var (mw, ctx) = Build(AuthenticatedUser("uid-1"));
        ctx.Request.Headers["Authorization"] = "Bearer eyJ.valid.token";

        await mw.InvokeAsync(ctx);

        ctx.Request.Headers.ContainsKey("Authorization").Should().BeFalse();
    }

    [Fact]
    public async Task EmptyBearer_DoesNotTrigger401()
    {
        // A bare "Authorization: Bearer" (no token) is malformed but should not
        // collide with the "token supplied but rejected" path — treat as no token.
        var (mw, ctx) = Build();
        ctx.Request.Headers["Authorization"] = "Bearer ";

        await mw.InvokeAsync(ctx);

        ctx.Response.StatusCode.Should().Be(StatusCodes.Status200OK);
    }

    [Theory]
    [InlineData("X-Client-Lat", "40.4168")]
    [InlineData("X-Client-Lng", "-3.7038")]
    [InlineData("X-Client-City", "Madrid")]
    [InlineData("X-Client-Country", "Spain")]
    public async Task XClient_GeolocationHeaders_AreForwardedAsIs(string name, string value)
    {
        var (mw, ctx) = Build();
        ctx.Request.Headers[name] = value;

        await mw.InvokeAsync(ctx);

        ctx.Request.Headers[name].ToString().Should().Be(value);
    }
}
