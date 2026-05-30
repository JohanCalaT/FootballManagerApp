using FootballManagerApp.Players.Application.Common.DTOs;

namespace FootballManagerApp.Players.Application.Common.Interfaces;

public interface ICommentsClient
{
    Task<IEnumerable<CommentDto>> GetByPlayerIdAsync(
        Guid playerId, CancellationToken ct);

    Task<bool> DeleteAsync(Guid commentId, CancellationToken ct);

    Task<bool> DeleteByPlayerIdAsync(Guid playerId, CancellationToken ct);
}
