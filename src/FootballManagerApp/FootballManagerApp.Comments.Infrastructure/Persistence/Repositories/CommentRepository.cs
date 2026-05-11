using FootballManagerApp.Comments.Application.Common.Interfaces;
using FootballManagerApp.Comments.Domain.Entities;

namespace FootballManagerApp.Comments.Infrastructure.Persistence.Repositories;

public class CommentRepository : ICommentRepository
{
    private readonly CommentsDbContext _db;

    public CommentRepository(CommentsDbContext db) => _db = db;

    public Task<Comment?> GetByIdAsync(Guid id, CancellationToken ct) =>
        throw new NotImplementedException("TODO Fase 2");

    public Task<IEnumerable<Comment>> GetByPlayerIdAsync(
        Guid playerId, CancellationToken ct) =>
        throw new NotImplementedException("TODO Fase 2");

    public Task<Comment> CreateAsync(Comment comment, CancellationToken ct) =>
        throw new NotImplementedException("TODO Fase 2");

    public Task DeleteAsync(Guid id, CancellationToken ct) =>
        throw new NotImplementedException("TODO Fase 2");
}
