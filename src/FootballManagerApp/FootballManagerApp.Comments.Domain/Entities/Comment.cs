using FootballManagerApp.Comments.Domain.Exceptions;
using FootballManagerApp.Shared.Exceptions;
using FootballManagerApp.Shared.ValueObjects;

namespace FootballManagerApp.Comments.Domain.Entities;

public class Comment
{
    public Guid Id { get; private set; }
    public Guid PlayerId { get; private set; }
    public string Author { get; private set; } = null!;
    public string Text { get; private set; } = null!;
    public int Rating { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public string? CreatedByUserId { get; private set; }
    public Geolocation? ClientGeolocation { get; private set; }

    private Comment() { }

    public static Comment Create(
        Guid playerId,
        string author,
        string text,
        int rating,
        string? createdByUserId = null,
        Geolocation? clientGeolocation = null)
    {
        if (playerId == Guid.Empty)
            throw new DomainException("PlayerId es obligatorio");
        if (string.IsNullOrWhiteSpace(author))
            throw new DomainException("Author es obligatorio");
        if (string.IsNullOrWhiteSpace(text))
            throw new DomainException("El texto del comentario es obligatorio");
        if (text.Length > 1000)
            throw new DomainException("El texto no puede superar 1000 caracteres");
        if (rating < 0 || rating > 5)
            throw new InvalidRatingException(rating);

        return new Comment
        {
            Id = Guid.NewGuid(),
            PlayerId = playerId,
            Author = author.Trim(),
            Text = text.Trim(),
            Rating = rating,
            CreatedAt = DateTime.UtcNow,
            CreatedByUserId = createdByUserId,
            ClientGeolocation = clientGeolocation,
        };
    }
}
