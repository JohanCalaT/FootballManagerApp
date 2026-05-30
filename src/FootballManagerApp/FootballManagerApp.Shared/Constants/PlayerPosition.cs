namespace FootballManagerApp.Shared.Constants;

public static class PlayerPosition
{
    public const string Goalkeeper = "Goalkeeper";
    public const string Defender   = "Defender";
    public const string Midfielder = "Midfielder";
    public const string Attacker   = "Attacker";

    public static readonly string[] All =
    {
        Goalkeeper, Defender, Midfielder, Attacker,
    };

    public static bool IsValid(string position) =>
        Array.IndexOf(All, position) >= 0;
}
