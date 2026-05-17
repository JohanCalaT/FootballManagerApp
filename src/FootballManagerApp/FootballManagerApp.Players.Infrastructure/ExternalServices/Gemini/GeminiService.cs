using System.Net.Http.Json;
using System.Text.Json;
using FootballManagerApp.Players.Application.Common.Exceptions;
using FootballManagerApp.Players.Application.Common.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace FootballManagerApp.Players.Infrastructure.ExternalServices.Gemini;

public sealed class GeminiService : IGeminiService
{
    private readonly HttpClient _http;
    private readonly ILogger<GeminiService> _log;
    private readonly string _apiKey;
    private readonly string _model;

    public GeminiService(
        HttpClient http,
        IConfiguration config,
        ILogger<GeminiService> log)
    {
        _http = http;
        _log = log;
        _apiKey = config["Gemini:ApiKey"]
            ?? throw new InvalidOperationException(
                "Gemini:ApiKey missing — set via Aspire parameter or user-secrets.");
        _model = config["Gemini:Model"] ?? "gemini-2.0-flash";

        var timeoutSeconds = config.GetValue<int?>("Gemini:TimeoutSeconds") ?? 30;
        _http.Timeout = TimeSpan.FromSeconds(timeoutSeconds);
    }

    public async Task<string> GenerateIdealTeamAsync(
        string prompt, CancellationToken ct)
    {
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/" +
                  $"{_model}:generateContent?key={_apiKey}";

        var body = new
        {
            contents = new[]
            {
                new { parts = new[] { new { text = prompt } } },
            },
            generationConfig = new { responseMimeType = "application/json" },
        };

        HttpResponseMessage resp;
        try
        {
            resp = await _http.PostAsJsonAsync(url, body, ct);
        }
        catch (TaskCanceledException ex) when (!ct.IsCancellationRequested)
        {
            _log.LogWarning(ex, "Gemini request timed out");
            throw new GeminiUnavailableException("Gemini timeout", ex);
        }
        catch (HttpRequestException ex)
        {
            _log.LogWarning(ex, "Gemini HTTP request failed");
            throw new GeminiUnavailableException("Gemini unreachable", ex);
        }

        if (!resp.IsSuccessStatusCode)
        {
            _log.LogWarning(
                "Gemini returned {StatusCode}", (int)resp.StatusCode);
            throw new GeminiUnavailableException(
                $"Gemini returned HTTP {(int)resp.StatusCode}");
        }

        try
        {
            await using var stream = await resp.Content.ReadAsStreamAsync(ct);
            using var doc = await JsonDocument.ParseAsync(
                stream, cancellationToken: ct);

            var text = doc.RootElement
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString();

            if (string.IsNullOrWhiteSpace(text))
                throw new GeminiUnavailableException("Empty Gemini response");

            return text;
        }
        catch (JsonException ex)
        {
            _log.LogWarning(ex, "Gemini returned malformed JSON");
            throw new GeminiUnavailableException("Malformed Gemini response", ex);
        }
        catch (KeyNotFoundException ex)
        {
            throw new GeminiUnavailableException(
                "Gemini response missing expected fields", ex);
        }
        catch (InvalidOperationException ex)
        {
            throw new GeminiUnavailableException(
                "Gemini response shape unexpected", ex);
        }
    }
}
