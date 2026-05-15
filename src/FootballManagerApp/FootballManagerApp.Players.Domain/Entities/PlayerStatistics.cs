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

    public void SetLeague(int? id, string? name, string? country, string? logo)
    {
        LeagueId = id;
        LeagueName = name;
        LeagueCountry = country;
        LeagueLogo = logo;
    }

    public void SetTeam(int? id, string? name, string? logo)
    {
        TeamId = id;
        TeamName = name;
        TeamLogo = logo;
    }

    public void SetGames(
        int appearances,
        int lineups,
        int minutesPlayed,
        string? position,
        decimal? rating,
        bool captain)
    {
        Appearances = appearances;
        Lineups = lineups;
        MinutesPlayed = minutesPlayed;
        Position = position;
        Rating = rating;
        Captain = captain;
    }

    public void SetSubstitutes(int inCount, int outCount, int bench)
    {
        SubstitutesIn = inCount;
        SubstitutesOut = outCount;
        SubstitutesBench = bench;
    }

    public void SetOffensive(
        int shotsTotal,
        int shotsOnTarget,
        int goals,
        int assists,
        int penaltyScored,
        int penaltyMissed)
    {
        ShotsTotal = shotsTotal;
        ShotsOnTarget = shotsOnTarget;
        Goals = goals;
        Assists = assists;
        PenaltyScored = penaltyScored;
        PenaltyMissed = penaltyMissed;
    }

    public void SetDefensive(
        int goalsConceded,
        int goalsSaved,
        int penaltySaved,
        int tacklesTotal,
        int tacklesBlocks,
        int interceptions)
    {
        GoalsConceded = goalsConceded;
        GoalsSaved = goalsSaved;
        PenaltySaved = penaltySaved;
        TacklesTotal = tacklesTotal;
        TacklesBlocks = tacklesBlocks;
        Interceptions = interceptions;
    }

    public void SetPassingAndDribbling(
        int passesTotal,
        int passesKey,
        int passesAccuracy,
        int duelsTotal,
        int duelsWon,
        int dribblesAttempts,
        int dribblesSuccess)
    {
        PassesTotal = passesTotal;
        PassesKey = passesKey;
        PassesAccuracy = passesAccuracy;
        DuelsTotal = duelsTotal;
        DuelsWon = duelsWon;
        DribblesAttempts = dribblesAttempts;
        DribblesSuccess = dribblesSuccess;
    }

    public void SetDiscipline(
        int foulsDrawn,
        int foulsCommitted,
        int yellowCards,
        int yellowRedCards,
        int redCards)
    {
        FoulsDrawn = foulsDrawn;
        FoulsCommitted = foulsCommitted;
        YellowCards = yellowCards;
        YellowRedCards = yellowRedCards;
        RedCards = redCards;
    }
}
