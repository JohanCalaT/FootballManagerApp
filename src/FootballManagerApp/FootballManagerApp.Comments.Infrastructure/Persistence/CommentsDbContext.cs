using FootballManagerApp.Comments.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace FootballManagerApp.Comments.Infrastructure.Persistence;

public class CommentsDbContext : DbContext
{
    public CommentsDbContext(DbContextOptions<CommentsDbContext> options)
        : base(options) { }

    public DbSet<Comment> Comments => Set<Comment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(CommentsDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
