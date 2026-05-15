using FluentValidation;
using FootballManagerApp.Comments.Application.Comments.DTOs;
using FootballManagerApp.Comments.Application.Comments.Mapping;
using FootballManagerApp.Comments.Application.Common.Interfaces;
using FootballManagerApp.Comments.Domain.Entities;
using FootballManagerApp.Shared.Exceptions;
using FootballManagerApp.Shared.Responses;
using FootballManagerApp.Shared.ValueObjects;
using Microsoft.Extensions.Logging;

namespace FootballManagerApp.Comments.Application.Comments.Handlers;

public class CreateCommentHandler
{
    private readonly ICommentRepository _repo;
    private readonly IValidator<CreateCommentDto> _validator;
    private readonly ILogger<CreateCommentHandler> _logger;

    public CreateCommentHandler(
        ICommentRepository repo,
        IValidator<CreateCommentDto> validator,
        ILogger<CreateCommentHandler> logger)
    {
        _repo = repo;
        _validator = validator;
        _logger = logger;
    }

    public async Task<ApiResponse<CommentDto>> HandleAsync(
        Guid playerId,
        CreateCommentDto dto,
        string? userId,
        CancellationToken ct)
    {
        if (playerId == Guid.Empty)
            return ApiResponse<CommentDto>.BadRequest("PlayerId es obligatorio");

        var validation = await _validator.ValidateAsync(dto, ct);
        if (!validation.IsValid)
        {
            var msg = string.Join("; ", validation.Errors.Select(e => e.ErrorMessage));
            return ApiResponse<CommentDto>.BadRequest(msg);
        }

        try
        {
            Geolocation? geo = null;
            if (dto.ClientLat.HasValue && dto.ClientLng.HasValue)
                geo = Geolocation.Create(
                    dto.ClientLat.Value, dto.ClientLng.Value,
                    dto.ClientCity, dto.ClientCountry);

            var comment = Comment.Create(
                playerId, dto.Author, dto.Text, dto.Rating, userId, geo);

            await _repo.CreateAsync(comment, ct);

            _logger.LogInformation(
                "Comment {CommentId} created for player {PlayerId} by {UserId}",
                comment.Id, playerId, userId ?? "anon");

            return ApiResponse<CommentDto>.Created(
                comment.ToDto(), "Comentario creado correctamente");
        }
        catch (DomainException ex)
        {
            _logger.LogWarning(ex, "Domain validation failed creating comment");
            return ApiResponse<CommentDto>.BadRequest(ex.Message);
        }
    }
}
