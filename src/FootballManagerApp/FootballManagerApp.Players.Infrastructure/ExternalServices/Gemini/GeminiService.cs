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
    private readonly TimeSpan _timeout;

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

        // gemini-2.5-pro/flash generating the full eleven (big JSON + reasoning)
        // routinely takes >30s; the previous absence of a per-attempt timeout let
        // a slow/hung call run until the SDK/HTTP default. Cap it (default 90s,
        // under YARP's 100s proxy default) and fail fast to 503 if exceeded.
        _timeout = TimeSpan.FromSeconds(
            int.TryParse(config["Gemini:TimeoutSeconds"], out var s) && s > 0 ? s : 90);
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
                // Per-attempt deadline: cancel this model's call if it exceeds
                // _timeout, while still honoring the caller's CancellationToken.
                using var attemptCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
                attemptCts.CancelAfter(_timeout);

                var response = await _client.Models.GenerateContentAsync(
                    model, prompt, config, attemptCts.Token);

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
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                // The caller (request) aborted — propagate, don't try more models.
                throw;
            }
            catch (OperationCanceledException)
            {
                // Our per-attempt timeout fired. Don't burn another full timeout
                // on the next model (would blow past the proxy budget) — fail fast.
                lastError = $"timeout after {_timeout.TotalSeconds:0}s";
                _log.LogWarning(
                    "Gemini {Model} timed out after {Timeout}s", model, _timeout.TotalSeconds);
                break;
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
