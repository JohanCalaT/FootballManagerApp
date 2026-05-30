using System.Text.Json.Serialization;

namespace FootballManagerApp.Shared.Responses;

public record PagedResponse<T>
{
    public int Status { get; init; }
    public string Message { get; init; } = string.Empty;
    public IEnumerable<T> Data { get; init; } = Array.Empty<T>();
    public int Page { get; init; }
    public int Limit { get; init; }
    public int Total { get; init; }
    public int Pages { get; init; }

    [JsonPropertyName("_links")]
    public Dictionary<string, HateoasLink> Links { get; init; } = new();

    public static PagedResponse<T> Success(
        IEnumerable<T> data,
        int page,
        int limit,
        int total,
        string message = "OK")
    {
        var pages = limit <= 0 ? 0 : (int)Math.Ceiling((double)total / limit);
        return new PagedResponse<T>
        {
            Status = 200,
            Message = message,
            Data = data,
            Page = page,
            Limit = limit,
            Total = total,
            Pages = pages,
        };
    }

    public PagedResponse<T> WithLinks(Dictionary<string, HateoasLink> links) =>
        this with { Links = links };
}
