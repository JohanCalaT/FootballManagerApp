using System.Text.Json;
using FluentAssertions;
using FootballManagerApp.Gateway.Middleware;
using Microsoft.AspNetCore.Http;
using Yarp.ReverseProxy.Forwarder;

namespace FootballManagerApp.Gateway.Tests.Middleware;

public class UpstreamErrorResponseMiddlewareTests
{
    private sealed class FakeForwarderError : IForwarderErrorFeature
    {
        public ForwarderError Error { get; init; } = ForwarderError.Request;
        public Exception? Exception { get; init; }
    }

    private static HttpContext NewContext()
    {
        var ctx = new DefaultHttpContext();
        ctx.Response.Body = new MemoryStream();
        return ctx;
    }

    private static async Task<string> ReadBody(HttpContext ctx)
    {
        ctx.Response.Body.Position = 0;
        return await new StreamReader(ctx.Response.Body).ReadToEndAsync();
    }

    [Theory]
    [InlineData(502, "Error de upstream")]
    [InlineData(503, "Backend no disponible")]
    [InlineData(504, "Backend tiempo de espera agotado")]
    public async Task ForwarderError_WritesApiResponseEnvelope(int status, string expectedMessage)
    {
        var ctx = NewContext();

        var mw = new UpstreamErrorResponseMiddleware(c =>
        {
            c.Response.StatusCode = status;
            c.Features.Set<IForwarderErrorFeature>(new FakeForwarderError());
            return Task.CompletedTask;
        });

        await mw.InvokeAsync(ctx);

        ctx.Response.StatusCode.Should().Be(status);
        ctx.Response.ContentType.Should().StartWith("application/json");

        using var doc = JsonDocument.Parse(await ReadBody(ctx));
        var root = doc.RootElement;
        root.GetProperty("status").GetInt32().Should().Be(status);
        root.GetProperty("message").GetString().Should().Be(expectedMessage);
        root.GetProperty("data").ValueKind.Should().Be(JsonValueKind.Null);
        root.GetProperty("_links").ValueKind.Should().Be(JsonValueKind.Object);
    }

    [Fact]
    public async Task NoForwarderError_LeavesResponseUntouched()
    {
        var ctx = NewContext();

        var mw = new UpstreamErrorResponseMiddleware(c =>
        {
            c.Response.StatusCode = 200;
            return Task.CompletedTask;
        });

        await mw.InvokeAsync(ctx);

        ctx.Response.StatusCode.Should().Be(200);
        ctx.Response.Body.Length.Should().Be(0);
    }

    [Fact]
    public async Task ForwarderError_NonTransportStatus_LeavesAsIs()
    {
        // Backend reachable but returned 404 with body — IForwarderErrorFeature
        // would not be set in practice, but even if it were, only 502/503/504 are rewritten.
        var ctx = NewContext();

        var mw = new UpstreamErrorResponseMiddleware(c =>
        {
            c.Response.StatusCode = 404;
            c.Features.Set<IForwarderErrorFeature>(new FakeForwarderError());
            return Task.CompletedTask;
        });

        await mw.InvokeAsync(ctx);

        ctx.Response.StatusCode.Should().Be(404);
        ctx.Response.Body.Length.Should().Be(0);
    }
}
