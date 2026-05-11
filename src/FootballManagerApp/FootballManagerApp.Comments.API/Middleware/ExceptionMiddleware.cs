using System.Text.Json;
using FootballManagerApp.Shared.Exceptions;
using FootballManagerApp.Shared.Responses;

namespace FootballManagerApp.Comments.API.Middleware;

public class ExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionMiddleware> _logger;

    public ExceptionMiddleware(
        RequestDelegate next,
        ILogger<ExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (DomainException ex)
        {
            _logger.LogWarning(ex, "Domain validation falló en {Path}", context.Request.Path);
            await WriteResponseAsync(context, 400, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Excepción no manejada en {Path}", context.Request.Path);
            await WriteResponseAsync(context, 500, "Error interno del servidor");
        }
    }

    private static async Task WriteResponseAsync(
        HttpContext context, int status, string message)
    {
        context.Response.StatusCode = status;
        context.Response.ContentType = "application/json";

        var body = status switch
        {
            400 => ApiResponse<object>.BadRequest(message),
            500 => ApiResponse<object>.ServerError(message),
            _   => ApiResponse<object>.ServerError(message),
        };

        var json = JsonSerializer.Serialize(body, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        });
        await context.Response.WriteAsync(json);
    }
}
