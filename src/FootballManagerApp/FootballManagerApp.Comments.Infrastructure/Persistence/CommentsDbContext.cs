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
        // TODO Fase 2: aplicar configuraciones con
        // modelBuilder.ApplyConfigurationsFromAssembly(...)
        base.OnModelCreating(modelBuilder);
    }
}
