namespace FootballManagerApp.Players.Application.Common.ApiFootball;

public abstract record ApiFootballError(string Message)
{
    public sealed record NotFound()
        : ApiFootballError("Jugador no encontrado en API-Football");

    public sealed record InvalidParameter(string Param)
        : ApiFootballError($"Parámetro inválido: {Param}");

    public sealed record SeasonNotAvailable(int Season)
        : ApiFootballError(
            $"Temporada {Season} no disponible. Usa: 2022, 2023 o 2024");

    public sealed record AuthenticationFailed()
        : ApiFootballError("Error de autenticación con API-Football");

    public sealed record RateLimited()
        : ApiFootballError("Límite de requests por minuto alcanzado");

    public sealed record DailyQuotaExceeded()
        : ApiFootballError("Cuota diaria de 100 requests agotada");

    public sealed record UpstreamError(int? HttpStatus)
        : ApiFootballError($"Error en API-Football (HTTP {HttpStatus})");

    public sealed record Timeout()
        : ApiFootballError("Timeout al conectar con API-Football");
}
