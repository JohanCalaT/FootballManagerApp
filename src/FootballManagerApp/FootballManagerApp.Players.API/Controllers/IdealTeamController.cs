using FootballManagerApp.Players.Application.IdealTeam.DTOs;
using FootballManagerApp.Players.Application.IdealTeam.Handlers;
using FootballManagerApp.Players.Application.Players.DTOs;
using FootballManagerApp.Shared.Responses;
using Microsoft.AspNetCore.Mvc;

namespace FootballManagerApp.Players.API.Controllers;

[ApiController]
[Route("api/ideal-team")]
public class IdealTeamController : ControllerBase
{
    private readonly GenerateIdealTeamHandler _handler;

    public IdealTeamController(GenerateIdealTeamHandler handler) =>
        _handler = handler;

    [HttpPost(Name = "GenerateIdealTeam")]
    public async Task<IActionResult> Generate(
        [FromBody] GenerateIdealTeamDto dto,
        CancellationToken ct)
    {
        var userId = Request.Headers["X-User-Id"].FirstOrDefault();
        if (string.IsNullOrWhiteSpace(userId))
        {
            var unauthorized = ApiResponse<IdealTeamResponseDto>.Unauthorized();
            return StatusCode(unauthorized.Status, unauthorized);
        }

        var result = await _handler.HandleAsync(dto, userId, ct);
        return StatusCode(result.Status, result);
    }
}
