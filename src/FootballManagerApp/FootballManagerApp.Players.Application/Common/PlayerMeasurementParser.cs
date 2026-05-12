namespace FootballManagerApp.Players.Application.Common;

/// <summary>
/// Parses the textual height/weight values returned by API-Football
/// (e.g. "188 cm", "80 kg") into integers. Pure logic, no I/O.
/// </summary>
public static class PlayerMeasurementParser
{
    public static int? ParseHeightCm(string? raw) => ParseWithUnit(raw, "cm");

    public static int? ParseWeightKg(string? raw) => ParseWithUnit(raw, "kg");

    private static int? ParseWithUnit(string? raw, string expectedUnit)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return null;
        }

        var trimmed = raw.Trim();
        var spaceIndex = trimmed.LastIndexOf(' ');
        if (spaceIndex <= 0)
        {
            return null;
        }

        var numberPart = trimmed[..spaceIndex];
        var unitPart = trimmed[(spaceIndex + 1)..];

        if (!unitPart.Equals(expectedUnit, StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        return int.TryParse(numberPart, out var value) && value > 0
            ? value
            : null;
    }
}
