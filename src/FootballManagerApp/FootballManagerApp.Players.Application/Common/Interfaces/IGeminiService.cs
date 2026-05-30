namespace FootballManagerApp.Players.Application.Common.Interfaces;

public interface IGeminiService
{
    Task<string> GenerateIdealTeamAsync(string prompt, CancellationToken ct);
}
