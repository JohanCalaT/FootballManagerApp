using FluentAssertions;
using FootballManagerApp.Gateway.Middleware;
using FootballManagerApp.Gateway.Strategies;
using Microsoft.AspNetCore.Http;

namespace FootballManagerApp.Gateway.Tests.Middleware;

public class BackendSelectorMiddlewareTests
{
    private static (BackendSelectorMiddleware mw, BackendStrategyFactory factory) Build(string active = "dotnet")
    {
        var factory = new BackendStrategyFactory(
            new IBackendStrategy[] { new DotnetStrategy(), new NodeStrategy() });
        factory.SetActive(active);

        var mw = new BackendSelectorMiddleware(_ => Task.CompletedTask);
        return (mw, factory);
    }

    private static HttpContext NewContext(string method, string path)
    {
        var ctx = new DefaultHttpContext();
        ctx.Request.Method = method;
        ctx.Request.Path = path;
        return ctx;
    }

    [Theory]
    [InlineData("GET",  "/api/players/search-external")]
    [InlineData("GET",  "/api/players/seasons/42")]
    [InlineData("POST", "/api/players/import")]
    [InlineData("POST", "/api/ideal-team")]
    public async Task AlwaysDotnetRoutes_DoNotStampBackendTarget(string method, string path)
    {
        var (mw, factory) = Build(active: "node");

        var ctx = NewContext(method, path);
        await mw.InvokeAsync(ctx, factory);

        ctx.Request.Headers.ContainsKey(BackendSelectorMiddleware.BackendTargetHeader)
            .Should().BeFalse();
    }

    [Theory]
    [InlineData("dotnet", "/api/players",            "dotnet")]
    [InlineData("dotnet", "/api/players/abc",        "dotnet")]
    [InlineData("dotnet", "/api/players/search",     "dotnet")]
    [InlineData("dotnet", "/api/comments/player/x",  "dotnet")]
    [InlineData("node",   "/api/players",            "node")]
    [InlineData("node",   "/api/players/abc",        "node")]
    [InlineData("node",   "/api/comments/player/x",  "node")]
    [InlineData("node",   "/api/comments/abc",       "node")]
    public async Task DynamicRoutes_StampHeaderWithActiveStrategy(
        string activeStrategy, string path, string expectedHeader)
    {
        var (mw, factory) = Build(active: activeStrategy);

        var ctx = NewContext("GET", path);
        await mw.InvokeAsync(ctx, factory);

        ctx.Request.Headers[BackendSelectorMiddleware.BackendTargetHeader]
            .ToString().Should().Be(expectedHeader);
    }

    [Fact]
    public async Task UnknownPath_DoesNotStampHeader()
    {
        var (mw, factory) = Build();

        var ctx = NewContext("GET", "/health");
        await mw.InvokeAsync(ctx, factory);

        ctx.Request.Headers.ContainsKey(BackendSelectorMiddleware.BackendTargetHeader)
            .Should().BeFalse();
    }

    [Fact]
    public async Task SearchExternalIsRecognized_RegardlessOfCasing()
    {
        var (mw, factory) = Build(active: "node");

        var ctx = NewContext("GET", "/API/Players/Search-External");
        await mw.InvokeAsync(ctx, factory);

        ctx.Request.Headers.ContainsKey(BackendSelectorMiddleware.BackendTargetHeader)
            .Should().BeFalse();
    }

    [Fact]
    public async Task IncomingBackendTargetHeader_IsStrippedToPreventSmuggling()
    {
        var (mw, factory) = Build(active: "dotnet");

        var ctx = NewContext("GET", "/api/players/search-external");
        ctx.Request.Headers[BackendSelectorMiddleware.BackendTargetHeader] = "node";

        await mw.InvokeAsync(ctx, factory);

        // Always-dotnet path: header must NOT remain "node" injected from client
        ctx.Request.Headers.ContainsKey(BackendSelectorMiddleware.BackendTargetHeader)
            .Should().BeFalse();
    }
}
