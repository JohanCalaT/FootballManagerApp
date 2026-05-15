using FootballManagerApp.Comments.Application.Common.Interfaces;
using FootballManagerApp.Comments.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace FootballManagerApp.Comments.Infrastructure.Persistence.Repositories;

public class CommentRepository : ICommentRepository
{
    private readonly CommentsDbContext _db;

    public CommentRepository(CommentsDbContext db) => _db = db;

    public Task<Comment?> GetByIdAsync(Guid id, CancellationToken ct) =>
        _db.Comments.FirstOrDefaultAsync(c => c.Id == id, ct);

    public async Task<IEnumerable<Comment>> GetByPlayerIdAsync(
        Guid playerId, CancellationToken ct) =>
        await _db.Comments
            .AsNoTracking()
            .Where(c => c.PlayerId == playerId)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync(ct);

    public async Task<Comment> CreateAsync(Comment comment, CancellationToken ct)
    {
        await _db.Comments.AddAsync(comment, ct);
        await _db.SaveChangesAsync(ct);
        return comment;
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct)
    {
        var entity = await _db.Comments.FindAsync([id], ct);
        if (entity is null) return;
        _db.Comments.Remove(entity);
        await _db.SaveChangesAsync(ct);
    }
}
