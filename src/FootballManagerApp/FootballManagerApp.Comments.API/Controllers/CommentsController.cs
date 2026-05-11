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
            "true",
            StringComparison.OrdinalIgnoreCase);

    [HttpGet("player/{playerId:guid}", Name = "GetCommentsByPlayer")]
    public IActionResult GetByPlayer(Guid playerId, CancellationToken ct)
    {
        return Ok(ApiResponse<string>.Success("Ready — TODO Fase 2"));
    }

    [HttpPost("player/{playerId:guid}", Name = "CreateCommentForPlayer")]
    public IActionResult Create(
        Guid playerId,
        [FromBody] CreateCommentDto dto,
        CancellationToken ct)
    {
        return Ok(ApiResponse<string>.Success("Ready — TODO Fase 2"));
    }

    [HttpDelete("{id:guid}", Name = "DeleteComment")]
    public IActionResult Delete(Guid id, CancellationToken ct)
    {
        return Ok(ApiResponse<string>.Success("Ready — TODO Fase 2"));
    }
}
