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

    // Optimistic concurrency token incrementado en cada modificación.
    // Portable entre Postgres y SQLite (a diferencia de xmin/rowversion).
    public int Version { get; private set; }

    // Soft-delete: DELETE marca este timestamp en vez de borrar la fila.
    // Las queries normales filtran por DeletedAt == null vía HasQueryFilter.
    public DateTime? DeletedAt { get; private set; }

    public void MarkDeleted() => DeletedAt = DateTime.UtcNow;

    private void Touch() => Version++;

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

    public void SetApiFootballId(int apiFootballId) => ApiFootballId = apiFootballId;

    public void SetPersonalInfo(
        string? firstName,
        string? lastName,
        string? nationality,
        DateTime? birthDate,
        string? birthPlace,
        string? birthCountry,
        string? height,
        string? weight)
    {
        FirstName = firstName;
        LastName = lastName;
        Nationality = nationality;
        BirthDate = birthDate;
        BirthPlace = birthPlace;
        BirthCountry = birthCountry;
        Height = height;
        Weight = weight;
    }

    public void SetFootballInfo(string? position, int? shirtNumber)
    {
        Position = position;
        ShirtNumber = shirtNumber;
    }

    public void UpdateTeamAndLeague(string team, string league)
    {
        if (string.IsNullOrWhiteSpace(team))
            throw new DomainException("El equipo es obligatorio");
        if (string.IsNullOrWhiteSpace(league))
            throw new DomainException("La liga es obligatoria");
        Team = team.Trim();
        League = league.Trim();
    }

    public void Rename(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainException("El nombre del jugador es obligatorio");
        Name = name.Trim();
    }

    public void MarkInjured(bool injured) => Injured = injured;

    public void SetImage(string? url, string? source)
    {
        if (source is not null
            && source is not "blob" and not "api" and not "url")
            throw new DomainException("ImageSource debe ser 'blob', 'api' o 'url'");
        ImageUrl = url;
        ImageSource = source;
    }

    public void SetClientGeolocation(Geolocation? geolocation) =>
        ClientGeolocation = geolocation;

    public void SetPlayerGeolocation(Geolocation? geolocation) =>
        PlayerGeolocation = geolocation;

    public void AddStatistics(PlayerStatistics stats)
    {
        if (stats.PlayerId != Id)
            throw new DomainException("Las estadísticas pertenecen a otro jugador");
        _statistics.Add(stats);
    }

    public void ReplaceStatistics(IEnumerable<PlayerStatistics> stats)
    {
        _statistics.Clear();
        foreach (var s in stats)
            AddStatistics(s);
    }
}
