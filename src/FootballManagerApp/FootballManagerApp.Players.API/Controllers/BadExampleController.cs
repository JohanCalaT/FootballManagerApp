using Microsoft.AspNetCore.Mvc;
using System.Net.Http;
using System.Text.Json;

namespace FootballManagerApp.Players.API.Controllers;

// NOTE: this controller is intentionally bad — it exists to validate the
// AI PR reviewer. It must NEVER reach develop or main.
[ApiController]
[Route("api/bad-example")]
public class BadExampleController : ControllerBase
{
    // Hardcoded secret — should trip common.hardcoded-secret (critical).
    private const string ApiFootballKey = "sk_live_1234567890abcdef_REAL_LOOKING_KEY";

    private readonly HttpClient _http = new HttpClient();

    // Business logic inside the controller (rating, normalization, HTTP call,
    // JSON parsing). Should trip dotnet.controller-logic (critical).
    // Returns the raw entity instead of a DTO / ApiResponse<T> — critical.
    // async without CancellationToken — major.
    [HttpGet("{id:int}")]
    public async Task<Player> GetPlayer(int id)
    {
        var url = $"https://v3.football.api-sports.io/players?id={id}&season=2024";
        var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Add("x-apisports-key", ApiFootballKey);

        var response = await _http.SendAsync(request);
        var body = await response.Content.ReadAsStringAsync();

        // Expected error path uses throw instead of ApiResponse — critical.
        if (!response.IsSuccessStatusCode)
        {
            throw new Exception($"API-Football returned {(int)response.StatusCode}");
        }

        using var doc = JsonDocument.Parse(body);
        var first = doc.RootElement.GetProperty("response")[0].GetProperty("player");
        var rating = first.GetProperty("rating").GetDouble();

        // Inline business rule — clearly belongs in a handler/service.
        var tier = rating switch
        {
            >= 8.0 => "S",
            >= 7.0 => "A",
            >= 6.0 => "B",
            _ => "C",
        };

        return new Player
        {
            Id = first.GetProperty("id").GetInt32(),
            Name = first.GetProperty("name").GetString() ?? "",
            Tier = tier,
        };
    }
}

// Raw entity exposed by the controller — should be a DTO record.
public class Player
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Tier { get; set; } = string.Empty;
}
