namespace FootballManagerApp.Players.Application.IdealTeam.DTOs;

/// <summary>
/// Proyección plana de un Player + agregados de sus statistics, usada para
/// construir el prompt de Gemini. Es el contrato interno que aísla al
/// servicio de Gemini de los detalles de PostgreSQL/MongoDB.
/// </summary>
public sealed record PlayerForPromptDto
{
    public required string Id { get; init; }
    public required string Name { get; init; }
    public required string Team { get; init; }
    public required string Position { get; init; }

    public decimal? AverageRating { get; init; }
    public int TotalGoals { get; init; }
    public int TotalAssists { get; init; }
    public int TotalAppearances { get; init; }
    public int TotalTackles { get; init; }
    public int TotalSaves { get; init; }
    public bool HasStatistics { get; init; }
}
