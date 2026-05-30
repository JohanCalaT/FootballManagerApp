using FluentAssertions;
using FootballManagerApp.Players.Infrastructure.ExternalServices.Gemini;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace FootballManagerApp.Players.Infrastructure.Tests.ExternalServices.Gemini;

// GeminiService is now a thin adapter over the official Google.GenAI SDK, which
// owns the transport (HTTP, auth, parsing, retries). Those paths belong to the
// SDK and are not re-tested here; we only cover our own contract — failing fast
// when the API key is not configured. End-to-end behaviour is exercised through
// the handler tests (which mock IGeminiService) and manual/integration runs.
public class GeminiServiceTests
{
    private static IConfiguration BuildConfig(string? apiKey) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Gemini:ApiKey"] = apiKey,
                ["Gemini:Model"] = "gemini-2.5-flash,gemini-2.0-flash",
            })
            .Build();

    [Fact]
    public void Ctor_WithoutApiKey_Throws()
    {
        var act = () => new GeminiService(
            BuildConfig(apiKey: null),
            NullLogger<GeminiService>.Instance);

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*Gemini:ApiKey*");
    }

    [Fact]
    public void Ctor_WithApiKey_DoesNotThrow()
    {
        var act = () => new GeminiService(
            BuildConfig(apiKey: "test-key"),
            NullLogger<GeminiService>.Instance);

        act.Should().NotThrow();
    }
}
