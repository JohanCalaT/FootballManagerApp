using FootballManagerApp.Shared.Exceptions;

namespace FootballManagerApp.Comments.Domain.Exceptions;

public sealed class CommentNotFoundException : DomainException
{
    public CommentNotFoundException(Guid id)
        : base($"Comentario con id {id} no encontrado") { }
}
