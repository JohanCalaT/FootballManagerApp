using FootballManagerApp.Shared.Exceptions;

namespace FootballManagerApp.Players.Domain.Exceptions;

public sealed class PlayerAlreadyExistsException : DomainException
{
    public PlayerAlreadyExistsException(int apiFootballId, int season)
        : base($"Jugador {apiFootballId} temporada {season} ya existe") { }
}
