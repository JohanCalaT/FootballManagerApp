namespace FootballManagerApp.Shared.Constants;

public static class ImageSource
{
    public const string Blob = "blob";
    public const string Api  = "api";
    public const string Url  = "url";

    public static readonly string[] All = { Blob, Api, Url };

    public static bool IsValid(string source) =>
        Array.IndexOf(All, source) >= 0;
}
