using FootballManagerApp.Comments.Domain.Entities;

namespace FootballManagerApp.Comments.Application.Common.Interfaces;

public interface ICommentRepository
{
    Task<Comment?> GetByIdAsync(Guid id, CancellationToken ct);

    Task<IEnumerable<Comment>> GetByPlayerIdAsync(
        Guid playerId, CancellationToken ct);

    Task<Comment> CreateAsync(Comment comment, CancellationToken ct);

    Task DeleteAsync(Guid id, CancellationToken ct);
}
