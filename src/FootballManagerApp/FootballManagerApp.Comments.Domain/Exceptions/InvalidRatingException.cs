using FootballManagerApp.Shared.Exceptions;

namespace FootballManagerApp.Comments.Domain.Exceptions;

public sealed class InvalidRatingException : DomainException
{
    public InvalidRatingException(decimal rating)
        : base($"Rating inválido: {rating}. Debe estar entre 0 y 5 con paso 0.5") { }
}
