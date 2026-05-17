namespace FootballManagerApp.Players.Application.Common.Exceptions;

/// <summary>
/// Lanzada cuando Gemini no responde, devuelve un error HTTP, agota timeout
/// o produce un payload inválido. ExceptionMiddleware la mapea a HTTP 503.
/// </summary>
public sealed class GeminiUnavailableException : Exception
{
    public GeminiUnavailableException(string message) : base(message) { }
    public GeminiUnavailableException(string message, Exception inner)
        : base(message, inner) { }
}
