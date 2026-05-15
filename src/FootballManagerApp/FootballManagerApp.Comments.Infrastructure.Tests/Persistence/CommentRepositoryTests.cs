using FluentAssertions;
using FootballManagerApp.Comments.Domain.Entities;
using FootballManagerApp.Comments.Infrastructure.Persistence.Repositories;
using FootballManagerApp.Shared.ValueObjects;

namespace FootballManagerApp.Comments.Infrastructure.Tests.Persistence;

public class CommentRepositoryTests : IDisposable
{
    private readonly SqliteCommentsDbContextFactory _factory = new();

    public void Dispose() => _factory.Dispose();

    private static Comment NewComment(Guid playerId, string author = "Johan", decimal rating = 5m) =>
        Comment.Create(
            playerId,
            author,
            "Texto del comentario",
            rating,
            createdByUserId: "uid-1",
            clientGeolocation: Geolocation.Create(36.84m, -2.46m, "Almería", "Spain"));

    [Fact]
    public async Task CreateAsync_persists_comment_with_owned_geolocation()
    {
        var playerId = Guid.NewGuid();
        var comment = NewComment(playerId);

        await using (var ctx = _factory.CreateContext())
        {
            await new CommentRepository(ctx).CreateAsync(comment, default);
        }

        await using var read = _factory.CreateContext();
        var loaded = await read.Comments.FindAsync(comment.Id);

        loaded.Should().NotBeNull();
        loaded!.Author.Should().Be("Johan");
        loaded.ClientGeolocation.Should().NotBeNull();
        loaded.ClientGeolocation!.City.Should().Be("Almería");
    }

    [Fact]
    public async Task GetByIdAsync_returns_comment()
    {
        var comment = NewComment(Guid.NewGuid());
        await using (var ctx = _factory.CreateContext())
        {
            await new CommentRepository(ctx).CreateAsync(comment, default);
        }

        await using var read = _factory.CreateContext();
        var loaded = await new CommentRepository(read).GetByIdAsync(comment.Id, default);

        loaded.Should().NotBeNull();
        loaded!.Id.Should().Be(comment.Id);
    }

    [Fact]
    public async Task GetByIdAsync_returns_null_when_missing()
    {
        await using var ctx = _factory.CreateContext();
        var result = await new CommentRepository(ctx).GetByIdAsync(Guid.NewGuid(), default);
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetByPlayerIdAsync_returns_only_player_comments_ordered_desc()
    {
        var playerA = Guid.NewGuid();
        var playerB = Guid.NewGuid();

        await using (var ctx = _factory.CreateContext())
        {
            var repo = new CommentRepository(ctx);
            await repo.CreateAsync(NewComment(playerA, "First"), default);
            await Task.Delay(10);
            await repo.CreateAsync(NewComment(playerA, "Second"), default);
            await repo.CreateAsync(NewComment(playerB, "Other"), default);
        }

        await using var read = _factory.CreateContext();
        var list = (await new CommentRepository(read)
            .GetByPlayerIdAsync(playerA, default)).ToList();

        list.Should().HaveCount(2);
        list.Should().BeInDescendingOrder(c => c.CreatedAt);
        list.Should().OnlyContain(c => c.PlayerId == playerA);
    }

    [Fact]
    public async Task DeleteAsync_removes_comment()
    {
        var comment = NewComment(Guid.NewGuid());
        await using (var ctx = _factory.CreateContext())
        {
            await new CommentRepository(ctx).CreateAsync(comment, default);
        }

        await using (var ctx = _factory.CreateContext())
        {
            await new CommentRepository(ctx).DeleteAsync(comment.Id, default);
        }

        await using var read = _factory.CreateContext();
        (await read.Comments.FindAsync(comment.Id)).Should().BeNull();
    }

    [Fact]
    public async Task DeleteAsync_is_idempotent_when_missing()
    {
        await using var ctx = _factory.CreateContext();
        var act = async () =>
            await new CommentRepository(ctx).DeleteAsync(Guid.NewGuid(), default);
        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task DeleteByPlayerIdAsync_removes_only_target_player_comments()
    {
        var playerA = Guid.NewGuid();
        var playerB = Guid.NewGuid();

        await using (var ctx = _factory.CreateContext())
        {
            var repo = new CommentRepository(ctx);
            await repo.CreateAsync(NewComment(playerA), default);
            await repo.CreateAsync(NewComment(playerA), default);
            await repo.CreateAsync(NewComment(playerB), default);
        }

        await using (var ctx = _factory.CreateContext())
        {
            var deleted = await new CommentRepository(ctx)
                .DeleteByPlayerIdAsync(playerA, default);
            deleted.Should().Be(2);
        }

        await using var read = _factory.CreateContext();
        (await new CommentRepository(read).GetByPlayerIdAsync(playerA, default))
            .Should().BeEmpty();
        (await new CommentRepository(read).GetByPlayerIdAsync(playerB, default))
            .Should().HaveCount(1);
    }

    [Fact]
    public async Task DeleteByPlayerIdAsync_returns_zero_when_no_comments()
    {
        await using var ctx = _factory.CreateContext();
        var deleted = await new CommentRepository(ctx)
            .DeleteByPlayerIdAsync(Guid.NewGuid(), default);
        deleted.Should().Be(0);
    }
}
