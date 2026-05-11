namespace FootballManagerApp.Players.Domain.Entities;

public class PlayerStatistics
{
    public Guid Id { get; private set; }
    public Guid PlayerId { get; private set; }
    public int Season { get; private set; }

    public int? LeagueId { get; private set; }
    public string? LeagueName { get; private set; }
    public string? LeagueCountry { get; private set; }
    public string? LeagueLogo { get; private set; }

    public int? TeamId { get; private set; }
    public string? TeamName { get; private set; }
    public string? TeamLogo { get; private set; }

    public int Appearances { get; private set; }
    public int Lineups { get; private set; }
    public int MinutesPlayed { get; private set; }
    public string? Position { get; private set; }
    public decimal? Rating { get; private set; }
    public bool Captain { get; private set; }

    public int SubstitutesIn { get; private set; }
    public int SubstitutesOut { get; private set; }
    public int SubstitutesBench { get; private set; }

    public int ShotsTotal { get; private set; }
    public int ShotsOnTarget { get; private set; }
    public int Goals { get; private set; }
    public int GoalsConceded { get; private set; }
    public int Assists { get; private set; }
    public int GoalsSaved { get; private set; }

    public int PassesTotal { get; private set; }
    public int PassesKey { get; private set; }
    public int PassesAccuracy { get; private set; }

    public int TacklesTotal { get; private set; }
    public int TacklesBlocks { get; private set; }
    public int Interceptions { get; private set; }

    public int DuelsTotal { get; private set; }
    public int DuelsWon { get; private set; }

    public int DribblesAttempts { get; private set; }
    public int DribblesSuccess { get; private set; }

    public int FoulsDrawn { get; private set; }
    public int FoulsCommitted { get; private set; }

    public int YellowCards { get; private set; }
    public int YellowRedCards { get; private set; }
    public int RedCards { get; private set; }

    public int PenaltyScored { get; private set; }
    public int PenaltyMissed { get; private set; }
    public int PenaltySaved { get; private set; }

    private PlayerStatistics() { }

    public static PlayerStatistics Create(
        Guid playerId,
        int season,
        string? teamName,
        string? leagueName)
    {
        return new PlayerStatistics
        {
            Id = Guid.NewGuid(),
            PlayerId = playerId,
            Season = season,
            TeamName = teamName,
            LeagueName = leagueName,
        };
    }
}
