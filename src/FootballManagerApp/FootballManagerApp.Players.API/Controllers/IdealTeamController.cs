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

    private string? CurrentUserId =>
        Request.Headers["X-User-Id"].FirstOrDefault();

    [HttpPost(Name = "GenerateIdealTeam")]
    public IActionResult Generate(
        [FromBody] GenerateIdealTeamDto dto,
        CancellationToken ct)
    {
        return Ok(ApiResponse<string>.Success("Ready — TODO Fase 2"));
    }
}
