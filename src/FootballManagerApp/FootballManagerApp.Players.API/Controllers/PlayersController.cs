using FootballManagerApp.Players.Application.Players.DTOs;
using FootballManagerApp.Players.Application.Players.Handlers;
using FootballManagerApp.Shared.Responses;
using Microsoft.AspNetCore.Mvc;

namespace FootballManagerApp.Players.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PlayersController : ControllerBase
{
    private readonly GetAllPlayersHandler _getAllHandler;
    private readonly GetPlayerByIdHandler _getByIdHandler;
    private readonly SearchPlayersHandler _searchHandler;
    private readonly CreatePlayerHandler _createHandler;
    private readonly ImportPlayersHandler _importHandler;
    private readonly UpdatePlayerHandler _updateHandler;
    private readonly DeletePlayerHandler _deleteHandler;

    public PlayersController(
        GetAllPlayersHandler getAllHandler,
        GetPlayerByIdHandler getByIdHandler,
        SearchPlayersHandler searchHandler,
        CreatePlayerHandler createHandler,
        ImportPlayersHandler importHandler,
        UpdatePlayerHandler updateHandler,
        DeletePlayerHandler deleteHandler)
    {
        _getAllHandler = getAllHandler;
        _getByIdHandler = getByIdHandler;
        _searchHandler = searchHandler;
        _createHandler = createHandler;
        _importHandler = importHandler;
        _updateHandler = updateHandler;
        _deleteHandler = deleteHandler;
    }

    private string? CurrentUserId =>
        Request.Headers["X-User-Id"].FirstOrDefault();

    private bool IsAdmin =>
        string.Equals(
            Request.Headers["X-User-Admin"].FirstOrDefault(),
            "true",
            StringComparison.OrdinalIgnoreCase);

    [HttpGet(Name = "GetAllPlayers")]
    public IActionResult GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 10,
        CancellationToken ct = default)
    {
        return Ok(ApiResponse<string>.Success("Ready — TODO Fase 2"));
    }

    [HttpGet("search", Name = "SearchPlayers")]
    public IActionResult Search(
        [FromQuery] string? name,
        [FromQuery] string? team,
        [FromQuery] string? league,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 10,
        CancellationToken ct = default)
    {
        return Ok(ApiResponse<string>.Success("Ready — TODO Fase 2"));
    }

    [HttpGet("{id:guid}", Name = "GetPlayerById")]
    public IActionResult GetById(Guid id, CancellationToken ct)
    {
        return Ok(ApiResponse<string>.Success("Ready — TODO Fase 2"));
    }

    [HttpPost(Name = "CreatePlayer")]
    public IActionResult Create(
        [FromBody] CreatePlayerDto dto,
        CancellationToken ct)
    {
        return Ok(ApiResponse<string>.Success("Ready — TODO Fase 2"));
    }

    [HttpPost("import", Name = "ImportPlayers")]
    public IActionResult Import(
        [FromBody] IEnumerable<ImportPlayerItemDto> items,
        CancellationToken ct)
    {
        return Ok(ApiResponse<string>.Success("Ready — TODO Fase 2"));
    }

    [HttpPut("{id:guid}", Name = "UpdatePlayer")]
    public IActionResult Update(
        Guid id,
        [FromBody] UpdatePlayerDto dto,
        CancellationToken ct)
    {
        return Ok(ApiResponse<string>.Success("Ready — TODO Fase 2"));
    }

    [HttpDelete("{id:guid}", Name = "DeletePlayer")]
    public IActionResult Delete(Guid id, CancellationToken ct)
    {
        return Ok(ApiResponse<string>.Success("Ready — TODO Fase 2"));
    }
}
