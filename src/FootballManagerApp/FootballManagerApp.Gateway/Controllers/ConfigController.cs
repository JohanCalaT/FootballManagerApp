using FootballManagerApp.Gateway.Dtos;
using FootballManagerApp.Gateway.Strategies;
using Microsoft.AspNetCore.Mvc;

namespace FootballManagerApp.Gateway.Controllers;

[ApiController]
[Route("config/backend")]
// TODO: JWT Firebase validation — restrict to [Authorize(Policy = "Admin")]
public sealed class ConfigController : ControllerBase
{
    private readonly BackendStrategyFactory _factory;

    public ConfigController(BackendStrategyFactory factory) => _factory = factory;

    [HttpGet]
    public ActionResult<BackendStatusDto> Get() =>
        Ok(new BackendStatusDto(_factory.GetActive().Name, _factory.AvailableNames));

    [HttpPost]
    public ActionResult<BackendStatusDto> Set([FromBody] SetBackendRequest request)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Backend))
            return BadRequest(new { message = "Backend requerido." });

        try
        {
            _factory.SetActive(request.Backend);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }

        return Ok(new BackendStatusDto(_factory.GetActive().Name, _factory.AvailableNames));
    }
}
