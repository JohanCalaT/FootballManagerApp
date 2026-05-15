using System.Text.Json.Serialization;

namespace FootballManagerApp.Shared.Responses;

public record ApiResponse<T>
{
    public int Status { get; init; }
    public string Message { get; init; } = string.Empty;
    public T? Data { get; init; }

    [JsonPropertyName("_links")]
    public Dictionary<string, HateoasLink> Links { get; init; } = new();

    public static ApiResponse<T> Success(
        T data, string message = "OK", int status = 200) =>
        new() { Status = status, Message = message, Data = data };

    public static ApiResponse<T> Created(
        T data, string message = "Creado correctamente") =>
        new() { Status = 201, Message = message, Data = data };

    public static ApiResponse<T> NotFound(
        string message = "No encontrado") =>
        new() { Status = 404, Message = message, Data = default };

    public static ApiResponse<T> BadRequest(
        string message = "Solicitud inválida") =>
        new() { Status = 400, Message = message, Data = default };

    public static ApiResponse<T> Unauthorized(
        string message = "No autorizado") =>
        new() { Status = 401, Message = message, Data = default };

    public static ApiResponse<T> Forbidden(
        string message = "Sin permisos") =>
        new() { Status = 403, Message = message, Data = default };

    public static ApiResponse<T> ServerError(
        string message = "Error interno del servidor") =>
        new() { Status = 500, Message = message, Data = default };

    public static ApiResponse<T> NotImplemented(
        string message = "Funcionalidad no disponible") =>
        new() { Status = 501, Message = message, Data = default };

    public static ApiResponse<T> Conflict(
        string message = "Conflicto") =>
        new() { Status = 409, Message = message, Data = default };

    public static ApiResponse<T> NoContent() =>
        new() { Status = 204, Message = "Sin contenido", Data = default };

    public ApiResponse<T> WithLinks(Dictionary<string, HateoasLink> links) =>
        this with { Links = links };
}
