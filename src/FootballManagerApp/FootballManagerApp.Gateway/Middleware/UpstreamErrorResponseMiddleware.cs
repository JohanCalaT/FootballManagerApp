using System.Text.Json;
using System.Text.Json.Serialization;
using Yarp.ReverseProxy.Forwarder;

namespace FootballManagerApp.Gateway.Middleware;

/// <summary>
/// When YARP cannot reach the downstream cluster (DNS, connect refused, no
/// available destinations, timeout, …) it sets <c>HttpResponse.StatusCode</c>
/// to 502/503/504 and ends the request with an empty body — which breaks our
/// uniform <c>ApiResponse</c> JSON contract.
///
/// This middleware runs AFTER <see cref="EndpointRoutingMiddleware"/> and the
/// proxy pipeline; if it sees a YARP-issued transport error AND the response
/// hasn't been flushed yet, it rewrites the body as a proper
/// <c>{ status, message, data:null, _links:{} }</c> envelope so the frontend
/// strategy can react predictably.
/// </summary>
public sealed class UpstreamErrorResponseMiddleware
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.Never,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private readonly RequestDelegate _next;

    public UpstreamErrorResponseMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        await _next(context);

        if (context.Response.HasStarted)
            return;

        if (context.Features.Get<IForwarderErrorFeature>() is null)
            return;

        var status = context.Response.StatusCode;
        if (status is not (502 or 503 or 504))
            return;

        var message = status switch
        {
            503 => "Backend no disponible",
            504 => "Backend tiempo de espera agotado",
            _   => "Error de upstream",
        };

        context.Response.Clear();
        context.Response.StatusCode = status;
        context.Response.ContentType = "application/json; charset=utf-8";

        var payload = JsonSerializer.SerializeToUtf8Bytes(new UpstreamErrorEnvelope
        {
            Status  = status,
            Message = message,
        }, JsonOptions);

        context.Response.ContentLength = payload.Length;
        await context.Response.Body.WriteAsync(payload);
    }

    private sealed class UpstreamErrorEnvelope
    {
        public int Status { get; init; }
        public string Message { get; init; } = string.Empty;
        public object? Data { get; init; } = null;

        [JsonPropertyName("_links")]
        public Dictionary<string, object> Links { get; init; } = new();
    }
}
