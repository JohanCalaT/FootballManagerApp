using FootballManagerApp.Shared.Exceptions;

namespace FootballManagerApp.Players.Domain.Exceptions;

public sealed class PlayerNotFoundException : DomainException
{
    public PlayerNotFoundException(Guid id)
        : base($"Jugador con id {id} no encontrado") { }
}
