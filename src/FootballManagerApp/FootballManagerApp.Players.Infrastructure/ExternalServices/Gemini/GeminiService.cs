using FootballManagerApp.Players.Application.Common.Interfaces;
using Microsoft.Extensions.Configuration;

namespace FootballManagerApp.Players.Infrastructure.ExternalServices.Gemini;

public class GeminiService : IGeminiService
{
    private readonly HttpClient _http;
    private readonly IConfiguration _config;

    public GeminiService(HttpClient http, IConfiguration config)
    {
        _http = http;
        _config = config;
    }

    public Task<string> GenerateIdealTeamAsync(string prompt, CancellationToken ct) =>
        throw new NotImplementedException("TODO Fase 2");
}
