using FootballManagerApp.Comments.API.Hateoas;
using FootballManagerApp.Comments.Application.Comments.DTOs;
using FootballManagerApp.Comments.Application.Comments.Handlers;
using FootballManagerApp.Shared.Responses;
using Microsoft.AspNetCore.Mvc;

namespace FootballManagerApp.Comments.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CommentsController : ControllerBase
{
    private readonly GetCommentsByPlayerHandler _getByPlayerHandler;
    private readonly CreateCommentHandler _createHandler;
    private readonly DeleteCommentHandler _deleteHandler;

    public CommentsController(
        GetCommentsByPlayerHandler getByPlayerHandler,
        CreateCommentHandler createHandler,
        DeleteCommentHandler deleteHandler)
    {
        _getByPlayerHandler = getByPlayerHandler;
        _createHandler = createHandler;
        _deleteHandler = deleteHandler;
    }

    private string? CurrentUserId =>
        Request.Headers["X-User-Id"].FirstOrDefault();

    private bool IsAdmin =>
        string.Equals(
            Request.Headers["X-User-Admin"].FirstOrDefault(),
            "true", StringComparison.OrdinalIgnoreCase);

    [HttpGet("player/{playerId:guid}", Name = "GetCommentsByPlayer")]
    public async Task<IActionResult> GetByPlayer(Guid playerId, CancellationToken ct)
    {
        var result = await _getByPlayerHandler.HandleAsync(playerId, ct);
        if (result.Status == 200)
            result = result.WithLinks(CommentLinks.ForList(Url, playerId));
        return StatusCode(result.Status, result);
    }

    [HttpPost("player/{playerId:guid}", Name = "CreateCommentForPlayer")]
    public async Task<IActionResult> Create(
        Guid playerId,
        [FromBody] CreateCommentDto dto,
        CancellationToken ct)
    {
        var result = await _createHandler.HandleAsync(
            playerId, dto, CurrentUserId, ct);

        if (result.Status == 201 && result.Data is not null)
        {
            result = result.WithLinks(
                CommentLinks.ForDetail(Url, playerId, result.Data.Id, IsAdmin));
        }
        return StatusCode(result.Status, result);
    }

    [HttpDelete("{id:guid}", Name = "DeleteComment")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        if (!IsAdmin)
            return StatusCode(403, ApiResponse<object>.Forbidden());

        var result = await _deleteHandler.HandleAsync(id, ct);
        return result.Status == 204
            ? NoContent()
            : StatusCode(result.Status, result);
    }
}
