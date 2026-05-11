using FootballManagerApp.Shared.Exceptions;

namespace FootballManagerApp.Players.Domain.Exceptions;

public sealed class InvalidGeolocationException : DomainException
{
    public InvalidGeolocationException(string campo, decimal valor)
        : base($"{campo} inválido: {valor}") { }
}
