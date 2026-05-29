using FootballManagerApp.Players.Application.Common.Exceptions;
using FootballManagerApp.Players.Application.Common.Interfaces;
using Google.GenAI;
using Google.GenAI.Types;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace FootballManagerApp.Players.Infrastructure.ExternalServices.Gemini;

/// <summary>
/// Gemini adapter built on Google's official <c>Google.GenAI</c> SDK. The
/// Application layer only sees <see cref="IGeminiService"/>, so the transport
/// (HTTP, auth, parsing, retries) stays an infrastructure detail.
///
/// JSON output is requested via <c>responseMimeType</c>. <c>Gemini:Model</c>
/// may be a single id or a comma-separated fallback chain
/// (e.g. "gemini-2.5-flash,gemini-2.0-flash"): each is tried in order so a model
/// unavailable for the key/project falls through to the next, mirroring the AI
/// PR-review's model chain.
/// </summary>
public sealed class GeminiService : IGeminiService
{
    private readonly Client _client;
    private readonly ILogger<GeminiService> _log;
    private readonly IReadOnlyList<string> _models;

    public GeminiService(IConfiguration config, ILogger<GeminiService> log)
    {
        _log = log;

        var apiKey = config["Gemini:ApiKey"]
            ?? throw new InvalidOperationException(
                "Gemini:ApiKey missing — set via Aspire parameter or user-secrets.");
        _client = new Client(apiKey: apiKey);

        var configured = config["Gemini:Model"];
        _models = string.IsNullOrWhiteSpace(configured)
            ? new[] { "gemini-2.5-pro","gemini-2.5-flash" }
            : configured.Split(
                ',',
                StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
    }

    public async Task<string> GenerateIdealTeamAsync(
        string prompt, CancellationToken ct)
    {
        var config = new GenerateContentConfig
        {
            ResponseMimeType = "application/json",
        };

        string? lastError = null;

        foreach (var model in _models)
        {
            ct.ThrowIfCancellationRequested();
            try
            {
                var response = await _client.Models.GenerateContentAsync(
                    model, prompt, config, ct);

                // `Text` concatenates the text parts of the first candidate.
                var text = response.Text;
                if (string.IsNullOrWhiteSpace(text))
                {
                    lastError = "empty response";
                    _log.LogWarning(
                        "Gemini {Model} returned an empty response", model);
                    continue;
                }

                return text;
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception ex)
            {
                // The SDK surfaces Google's cause in the message (model not
                // found, API not enabled, quota exceeded…). Log it and try the
                // next model in the chain.
                lastError = ex.Message;
                _log.LogWarning(ex, "Gemini {Model} request failed", model);
            }
        }

        throw new GeminiUnavailableException(
            $"Gemini unavailable for models [{string.Join(", ", _models)}]. " +
            $"Last error: {lastError}");
    }
}
