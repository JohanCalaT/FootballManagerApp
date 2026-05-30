namespace FootballManagerApp.Shared.Constants;

public static class ApiFootballSeasons
{
    public static readonly int[] Valid = { 2022, 2023, 2024 };

    public static bool IsValid(int season) =>
        Array.IndexOf(Valid, season) >= 0;
}
