using System.Net;
using System.Text;
using FluentAssertions;
using FootballManagerApp.Players.Application.Common.Exceptions;
using FootballManagerApp.Players.Infrastructure.ExternalServices.Gemini;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace FootballManagerApp.Players.Infrastructure.Tests.ExternalServices.Gemini;

public class GeminiServiceTests
{
    private static IConfiguration BuildConfig(string? apiKey = "test-key") =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Gemini:ApiKey"] = apiKey,
                ["Gemini:Model"] = "gemini-2.0-flash",
                ["Gemini:TimeoutSeconds"] = "5",
            })
            .Build();

    private static GeminiService Build(HttpMessageHandler handler) =>
        new(new HttpClient(handler),
            BuildConfig(),
            NullLogger<GeminiService>.Instance);

    private static HttpResponseMessage JsonOk(string body) =>
        new(HttpStatusCode.OK)
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json"),
        };

    [Fact]
    public void Ctor_WithoutApiKey_Throws()
    {
        var act = () => new GeminiService(
            new HttpClient(),
            BuildConfig(apiKey: null),
            NullLogger<GeminiService>.Instance);

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*Gemini:ApiKey*");
    }

    [Fact]
    public async Task GenerateIdealTeamAsync_ReturnsTextFromCandidates()
    {
        const string body = """
            {
              "candidates": [
                { "content": { "parts": [ { "text": "{\"formation\":\"4-3-3\"}" } ] } }
              ]
            }
            """;
        var sut = Build(new StubHandler(_ => JsonOk(body)));

        var text = await sut.GenerateIdealTeamAsync("prompt", default);

        text.Should().Be("{\"formation\":\"4-3-3\"}");
    }

    [Fact]
    public async Task GenerateIdealTeamAsync_When500_ThrowsGeminiUnavailable()
    {
        var sut = Build(new StubHandler(
            _ => new HttpResponseMessage(HttpStatusCode.InternalServerError)));

        await sut.Invoking(s => s.GenerateIdealTeamAsync("p", default))
            .Should().ThrowAsync<GeminiUnavailableException>()
            .WithMessage("*HTTP 500*");
    }

    [Fact]
    public async Task GenerateIdealTeamAsync_OnMalformedJson_ThrowsGeminiUnavailable()
    {
        var sut = Build(new StubHandler(_ => JsonOk("not-json")));

        await sut.Invoking(s => s.GenerateIdealTeamAsync("p", default))
            .Should().ThrowAsync<GeminiUnavailableException>();
    }

    [Fact]
    public async Task GenerateIdealTeamAsync_OnMissingCandidates_ThrowsGeminiUnavailable()
    {
        var sut = Build(new StubHandler(_ => JsonOk("""{"foo":"bar"}""")));

        await sut.Invoking(s => s.GenerateIdealTeamAsync("p", default))
            .Should().ThrowAsync<GeminiUnavailableException>();
    }

    [Fact]
    public async Task GenerateIdealTeamAsync_OnEmptyText_ThrowsGeminiUnavailable()
    {
        const string body = """
            {"candidates":[{"content":{"parts":[{"text":""}]}}]}
            """;
        var sut = Build(new StubHandler(_ => JsonOk(body)));

        await sut.Invoking(s => s.GenerateIdealTeamAsync("p", default))
            .Should().ThrowAsync<GeminiUnavailableException>()
            .WithMessage("*Empty*");
    }

    [Fact]
    public async Task GenerateIdealTeamAsync_OnHttpRequestException_ThrowsGeminiUnavailable()
    {
        var sut = Build(new ThrowingHandler(new HttpRequestException("boom")));

        await sut.Invoking(s => s.GenerateIdealTeamAsync("p", default))
            .Should().ThrowAsync<GeminiUnavailableException>()
            .WithMessage("*unreachable*");
    }

    private sealed class StubHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _respond;
        public StubHandler(Func<HttpRequestMessage, HttpResponseMessage> respond)
            => _respond = respond;

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
            => Task.FromResult(_respond(request));
    }

    private sealed class ThrowingHandler : HttpMessageHandler
    {
        private readonly Exception _ex;
        public ThrowingHandler(Exception ex) => _ex = ex;

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
            => throw _ex;
    }
}
