using FluentAssertions;
using FootballManagerApp.Gateway.Middleware;
using Microsoft.AspNetCore.Http;

namespace FootballManagerApp.Gateway.Tests.Middleware;

public class HeaderForwardingMiddlewareTests
{
    private static (HeaderForwardingMiddleware mw, HttpContext ctx) Build()
    {
        var mw = new HeaderForwardingMiddleware(_ => Task.CompletedTask);
        var ctx = new DefaultHttpContext();
        return (mw, ctx);
    }

    [Fact]
    public async Task XUserId_IsForwardedToBackend()
    {
        var (mw, ctx) = Build();
        ctx.Request.Headers[HeaderForwardingMiddleware.UserIdHeader] = "firebase-uid-123";

        await mw.InvokeAsync(ctx);

        ctx.Request.Headers[HeaderForwardingMiddleware.UserIdHeader]
            .ToString().Should().Be("firebase-uid-123");
    }

    [Fact]
    public async Task XUserId_IsTrimmed()
    {
        var (mw, ctx) = Build();
        ctx.Request.Headers[HeaderForwardingMiddleware.UserIdHeader] = "   uid-42   ";

        await mw.InvokeAsync(ctx);

        ctx.Request.Headers[HeaderForwardingMiddleware.UserIdHeader]
            .ToString().Should().Be("uid-42");
    }

    [Fact]
    public async Task XUserId_Empty_IsStripped()
    {
        var (mw, ctx) = Build();
        ctx.Request.Headers[HeaderForwardingMiddleware.UserIdHeader] = "   ";

        await mw.InvokeAsync(ctx);

        ctx.Request.Headers.ContainsKey(HeaderForwardingMiddleware.UserIdHeader)
            .Should().BeFalse();
    }

    [Theory]
    [InlineData("true",  "true")]
    [InlineData("TRUE",  "true")]
    [InlineData(" True ","true")]
    [InlineData("false", "false")]
    [InlineData("nope",  "false")]
    [InlineData("1",     "false")]
    public async Task XUserAdmin_IsNormalizedToLowerBool(string input, string expected)
    {
        var (mw, ctx) = Build();
        ctx.Request.Headers[HeaderForwardingMiddleware.UserAdminHeader] = input;

        await mw.InvokeAsync(ctx);

        ctx.Request.Headers[HeaderForwardingMiddleware.UserAdminHeader]
            .ToString().Should().Be(expected);
    }

    [Fact]
    public async Task XUserAdmin_Empty_IsStripped()
    {
        var (mw, ctx) = Build();
        ctx.Request.Headers[HeaderForwardingMiddleware.UserAdminHeader] = "";

        await mw.InvokeAsync(ctx);

        ctx.Request.Headers.ContainsKey(HeaderForwardingMiddleware.UserAdminHeader)
            .Should().BeFalse();
    }

    [Fact]
    public async Task MissingHeaders_AreNotPropagated()
    {
        var (mw, ctx) = Build();

        await mw.InvokeAsync(ctx);

        ctx.Request.Headers.ContainsKey(HeaderForwardingMiddleware.UserIdHeader).Should().BeFalse();
        ctx.Request.Headers.ContainsKey(HeaderForwardingMiddleware.UserAdminHeader).Should().BeFalse();
    }

    [Fact]
    public async Task Authorization_IsStrippedBeforeForward()
    {
        var (mw, ctx) = Build();
        ctx.Request.Headers["Authorization"] = "Bearer eyJ...";

        await mw.InvokeAsync(ctx);

        ctx.Request.Headers.ContainsKey("Authorization").Should().BeFalse();
    }

    [Theory]
    [InlineData("X-Client-Lat",     "40.4168")]
    [InlineData("X-Client-Lng",     "-3.7038")]
    [InlineData("X-Client-City",    "Madrid")]
    [InlineData("X-Client-Country", "Spain")]
    public async Task XClient_GeolocationHeaders_AreForwardedAsIs(string name, string value)
    {
        var (mw, ctx) = Build();
        ctx.Request.Headers[name] = value;

        await mw.InvokeAsync(ctx);

        ctx.Request.Headers[name].ToString().Should().Be(value);
    }
}
