using FluentAssertions;
using FootballManagerApp.Comments.Domain.Entities;
using FootballManagerApp.Comments.Domain.Exceptions;
using FootballManagerApp.Shared.Exceptions;
using FootballManagerApp.Shared.Responses;

namespace FootballManagerApp.Comments.Application.Tests;

public class BaselineTests
{
    [Fact]
    public void Comment_Create_ShouldReturnValidComment()
    {
        var playerId = Guid.NewGuid();
        var comment = Comment.Create(playerId, "ana", "Buen partido", 5);

        comment.Id.Should().NotBeEmpty();
        comment.PlayerId.Should().Be(playerId);
        comment.Author.Should().Be("ana");
        comment.Text.Should().Be("Buen partido");
        comment.Rating.Should().Be(5);
        comment.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(6)]
    [InlineData(99)]
    public void Comment_Create_WithInvalidRating_ShouldThrow(decimal rating)
    {
        var act = () => Comment.Create(Guid.NewGuid(), "ana", "ok", rating);

        act.Should().Throw<InvalidRatingException>()
           .WithMessage($"*{rating}*");
    }

    [Theory]
    [InlineData(0.3)]
    [InlineData(2.7)]
    [InlineData(4.99)]
    public void Comment_Create_WithNonHalfStepRating_ShouldThrow(decimal rating)
    {
        var act = () => Comment.Create(Guid.NewGuid(), "ana", "ok", rating);
        act.Should().Throw<InvalidRatingException>();
    }

    [Theory]
    [InlineData(0)]
    [InlineData(0.5)]
    [InlineData(2.5)]
    [InlineData(5)]
    public void Comment_Create_WithValidHalfStep_ShouldSucceed(decimal rating)
    {
        var comment = Comment.Create(Guid.NewGuid(), "ana", "ok", rating);
        comment.Rating.Should().Be(rating);
    }

    [Fact]
    public void Comment_Create_WithTextOver1000Chars_ShouldThrow()
    {
        var longText = new string('x', 1001);

        var act = () => Comment.Create(Guid.NewGuid(), "ana", longText, 4);

        act.Should().Throw<DomainException>()
           .WithMessage("*1000*");
    }

    [Fact]
    public void ApiResponse_Created_ShouldHaveStatus201()
    {
        var response = ApiResponse<string>.Created("nuevo-comentario");

        response.Status.Should().Be(201);
        response.Data.Should().Be("nuevo-comentario");
    }
}
