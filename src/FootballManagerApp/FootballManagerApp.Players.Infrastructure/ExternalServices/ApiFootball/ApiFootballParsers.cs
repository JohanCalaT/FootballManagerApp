using System.Globalization;

namespace FootballManagerApp.Players.Infrastructure.ExternalServices.ApiFootball;

internal static class ApiFootballParsers
{
    // "170 cm" / "67 kg" → se conserva como string (Player.Height/Weight son string?).
    public static string? CleanLabel(string? raw) =>
        string.IsNullOrWhiteSpace(raw) ? null : raw.Trim();

    // "8.103125" → 8.10m. La API siempre usa '.' como separador decimal.
    public static decimal? ParseRating(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        return decimal.TryParse(
            raw, NumberStyles.Any, CultureInfo.InvariantCulture, out var v)
            ? Math.Round(v, 2)
            : null;
    }

    // "1987-06-24" → DateTime? con Kind=Utc.
    // Postgres timestamptz solo acepta UTC. AssumeUniversal sin AdjustToUniversal
    // devuelve Kind=Local (Local→UTC conversion implícita). Necesitamos ambos
    // flags + SpecifyKind para asegurar Kind=Utc.
    public static DateTime? ParseBirthDate(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        if (!DateTime.TryParseExact(
                raw, "yyyy-MM-dd",
                CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
                out var v))
            return null;
        return DateTime.SpecifyKind(v, DateTimeKind.Utc);
    }

    public static string NormalizeQuery(string raw) =>
        raw.Trim().ToLowerInvariant();
}
