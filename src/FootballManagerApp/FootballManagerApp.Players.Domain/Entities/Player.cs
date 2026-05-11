using FootballManagerApp.Shared.Exceptions;
using FootballManagerApp.Shared.ValueObjects;

namespace FootballManagerApp.Players.Domain.Entities;

public class Player
{
    public Guid Id { get; private set; }
    public int? ApiFootballId { get; private set; }

    public string Name { get; private set; } = null!;
    public string? FirstName { get; private set; }
    public string? LastName { get; private set; }
    public string? Nationality { get; private set; }
    public DateTime? BirthDate { get; private set; }
    public string? BirthPlace { get; private set; }
    public string? BirthCountry { get; private set; }
    public string? Height { get; private set; }
    public string? Weight { get; private set; }
    public bool Injured { get; private set; }

    public string Team { get; private set; } = null!;
    public string League { get; private set; } = null!;
    public string? Position { get; private set; }
    public int? ShirtNumber { get; private set; }

    public string? ImageUrl { get; private set; }
    public string? ImageSource { get; private set; }

    public DateTime RegisteredAt { get; private set; }
    public string CreatedByUserId { get; private set; } = null!;

    public Geolocation? ClientGeolocation { get; private set; }
    public Geolocation? PlayerGeolocation { get; private set; }

    private readonly List<PlayerStatistics> _statistics = new();
    public IReadOnlyCollection<PlayerStatistics> Statistics => _statistics.AsReadOnly();

    private Player() { }

    public static Player Create(
        string name,
        string team,
        string league,
        string createdByUserId)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainException("El nombre del jugador es obligatorio");
        if (string.IsNullOrWhiteSpace(team))
            throw new DomainException("El equipo es obligatorio");
        if (string.IsNullOrWhiteSpace(league))
            throw new DomainException("La liga es obligatoria");
        if (string.IsNullOrWhiteSpace(createdByUserId))
            throw new DomainException("CreatedByUserId es obligatorio");

        return new Player
        {
            Id = Guid.NewGuid(),
            Name = name.Trim(),
            Team = team.Trim(),
            League = league.Trim(),
            CreatedByUserId = createdByUserId,
            RegisteredAt = DateTime.UtcNow,
        };
    }
}
