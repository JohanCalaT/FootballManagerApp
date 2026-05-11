using FootballManagerApp.Shared.Exceptions;

namespace FootballManagerApp.Comments.Domain.Exceptions;

public sealed class InvalidRatingException : DomainException
{
    public InvalidRatingException(int rating)
        : base($"Rating inválido: {rating}. Debe estar entre 0 y 5") { }
}
