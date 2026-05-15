using FootballManagerApp.Players.API.Hateoas;
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
            "true", StringComparison.OrdinalIgnoreCase);

    private decimal? Lat() =>
        decimal.TryParse(Request.Headers["X-Client-Lat"].FirstOrDefault(),
            System.Globalization.CultureInfo.InvariantCulture, out var v) ? v : null;
    private decimal? Lng() =>
        decimal.TryParse(Request.Headers["X-Client-Lng"].FirstOrDefault(),
            System.Globalization.CultureInfo.InvariantCulture, out var v) ? v : null;
    private string? City() => Request.Headers["X-Client-City"].FirstOrDefault();
    private string? Country() => Request.Headers["X-Client-Country"].FirstOrDefault();

    [HttpGet(Name = "GetAllPlayers")]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 10,
        CancellationToken ct = default)
    {
        var result = await _getAllHandler.HandleAsync(page, limit, ct);
        var withLinks = result.WithLinks(PlayerLinks.ForList(Url, page, limit, result.Total));
        return StatusCode(result.Status, withLinks);
    }

    [HttpGet("search", Name = "SearchPlayers")]
    public async Task<IActionResult> Search(
        [FromQuery] string? name,
        [FromQuery] string? team,
        [FromQuery] string? league,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 10,
        CancellationToken ct = default)
    {
        var result = await _searchHandler.HandleAsync(
            name, team, league, from, to, page, limit, ct);
        var withLinks = result.WithLinks(PlayerLinks.ForList(Url, page, limit, result.Total));
        return StatusCode(result.Status, withLinks);
    }

    [HttpGet("{id:guid}", Name = "GetPlayerById")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await _getByIdHandler.HandleAsync(id, ct);
        if (result.Status == 200)
        {
            result = result.WithLinks(PlayerLinks.ForDetail(Url, id, IsAdmin));
            if (result.Data is not null)
                Response.Headers.ETag = $"\"{result.Data.Version}\"";
        }
        return StatusCode(result.Status, result);
    }

    [HttpPost(Name = "CreatePlayer")]
    public async Task<IActionResult> Create(
        [FromBody] CreatePlayerDto dto,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(CurrentUserId))
            return StatusCode(401, ApiResponse<PlayerDetailDto>.Unauthorized());

        var result = await _createHandler.HandleAsync(
            dto, CurrentUserId, Lat(), Lng(), City(), Country(), ct);

        if (result.Status == 201 && result.Data is not null)
        {
            var id = result.Data.Id;
            result = result.WithLinks(PlayerLinks.ForDetail(Url, id, IsAdmin));
            Response.Headers.Location = Url.Link("GetPlayerById", new { id });
        }
        return StatusCode(result.Status, result);
    }

    [HttpPost("import", Name = "ImportPlayers")]
    public IActionResult Import(
        [FromBody] IEnumerable<ImportPlayerItemDto> items,
        CancellationToken ct)
    {
        // Fase 2B: requiere API-Football externa.
        var resp = ApiResponse<IEnumerable<PlayerListItemDto>>.NotImplemented(
            "Import quedará disponible en Fase 2B con API-Football");
        return StatusCode(resp.Status, resp);
    }

    [HttpPut("{id:guid}", Name = "UpdatePlayer")]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdatePlayerDto dto,
        CancellationToken ct)
    {
        if (!IsAdmin)
            return StatusCode(403, ApiResponse<PlayerDetailDto>.Forbidden());

        // If-Match: <version> opcional — habilita optimistic concurrency 412.
        int? ifMatch = int.TryParse(Request.Headers.IfMatch.FirstOrDefault()?.Trim('"'),
            out var v) ? v : null;

        var result = await _updateHandler.HandleAsync(id, dto, ifMatch, ct);
        if (result.Status == 200)
        {
            result = result.WithLinks(PlayerLinks.ForDetail(Url, id, IsAdmin));
            if (result.Data is not null)
                Response.Headers.ETag = $"\"{result.Data.Version}\"";
        }
        return StatusCode(result.Status, result);
    }

    [HttpDelete("{id:guid}", Name = "DeletePlayer")]
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
