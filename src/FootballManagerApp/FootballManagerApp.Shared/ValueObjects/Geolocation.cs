using FootballManagerApp.Shared.Exceptions;

namespace FootballManagerApp.Shared.ValueObjects;

public record Geolocation
{
    public decimal Lat { get; init; }
    public decimal Lng { get; init; }
    public string? City { get; init; }
    public string? Country { get; init; }

    private Geolocation() { }

    public static Geolocation Create(
        decimal lat,
        decimal lng,
        string? city = null,
        string? country = null)
    {
        if (lat < -90 || lat > 90)
            throw new DomainException($"Latitud inválida: {lat}");
        if (lng < -180 || lng > 180)
            throw new DomainException($"Longitud inválida: {lng}");

        return new Geolocation
        {
            Lat = lat,
            Lng = lng,
            City = city,
            Country = country,
        };
    }
}
