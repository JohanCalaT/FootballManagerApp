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
    public IActionResult Generate(
        [FromBody] GenerateIdealTeamDto dto,
        CancellationToken ct)
    {
        // Fase 2B: requiere Gemini.
        var resp = ApiResponse<IdealTeamResponseDto>.NotImplemented(
            "GenerateIdealTeam disponible en Fase 2B con Gemini");
        return StatusCode(resp.Status, resp);
    }
}
