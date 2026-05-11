using FootballManagerApp.Players.Application.Common.DTOs;
using FootballManagerApp.Players.Application.Common.Interfaces;

namespace FootballManagerApp.Players.Infrastructure.Http;

public class CommentsClient : ICommentsClient
{
    private readonly HttpClient _http;

    public CommentsClient(HttpClient http) => _http = http;

    public Task<IEnumerable<CommentDto>> GetByPlayerIdAsync(
        Guid playerId, CancellationToken ct) =>
        throw new NotImplementedException("TODO Fase 2");

    public Task<bool> DeleteAsync(Guid commentId, CancellationToken ct) =>
        throw new NotImplementedException("TODO Fase 2");
}
