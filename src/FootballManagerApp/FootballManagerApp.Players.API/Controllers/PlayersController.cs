using FootballManagerApp.Players.API.Hateoas;
using FootballManagerApp.Players.Application.Common.ApiFootball;
using FootballManagerApp.Players.Application.Common.DTOs;
using FootballManagerApp.Players.Application.Common.Interfaces;
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
    private readonly IApiFootballService _apiFootball;

    public PlayersController(
        GetAllPlayersHandler getAllHandler,
        GetPlayerByIdHandler getByIdHandler,
        SearchPlayersHandler searchHandler,
        CreatePlayerHandler createHandler,
        ImportPlayersHandler importHandler,
        UpdatePlayerHandler updateHandler,
        DeletePlayerHandler deleteHandler,
        IApiFootballService apiFootball)
    {
        _getAllHandler = getAllHandler;
        _getByIdHandler = getByIdHandler;
        _searchHandler = searchHandler;
        _createHandler = createHandler;
        _importHandler = importHandler;
        _updateHandler = updateHandler;
        _deleteHandler = deleteHandler;
        _apiFootball = apiFootball;
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
    public async Task<IActionResult> Import(
        [FromBody] IEnumerable<ImportPlayerItemDto> items,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(CurrentUserId))
            return StatusCode(401, ApiResponse<ImportResultDto>.Unauthorized());

        var result = await _importHandler.HandleAsync(
            items, CurrentUserId, Lat(), Lng(), City(), Country(), ct);
        return StatusCode(result.Status, result);
    }

    // ─────────────────── API-Football proxy endpoints (Fase 2B) ───────────────────
    // Públicos — el usuario no registrado puede buscar antes de decidir si crea cuenta.

    [HttpGet("search-external", Name = "SearchExternalPlayers")]
    public async Task<IActionResult> SearchExternal(
        [FromQuery] string query,
        [FromQuery] int page = 1,
        CancellationToken ct = default)
    {
        try
        {
            var pageResult = await _apiFootball.SearchProfilesAsync(query, page, ct);

            // Cada página API-Football = 20 items. Lo exponemos como PagedResponse
            // para que el frontend (móvil) pinte scroll infinito de 20 en 20.
            var paged = PagedResponse<ApiFootballProfileSummary>.Success(
                data:    pageResult.Items,
                page:    pageResult.Page,
                limit:   20,
                total:   pageResult.TotalResults);

            var links = new Dictionary<string, HateoasLink>
            {
                ["self"]  = new(Url.Link("SearchExternalPlayers",
                    new { query, page = pageResult.Page })!, "self", "GET"),
                ["first"] = new(Url.Link("SearchExternalPlayers",
                    new { query, page = 1 })!, "first", "GET"),
                ["last"]  = new(Url.Link("SearchExternalPlayers",
                    new { query, page = Math.Max(pageResult.TotalPages, 1) })!, "last", "GET"),
            };
            if (pageResult.Page > 1)
                links["prev"] = new(Url.Link("SearchExternalPlayers",
                    new { query, page = pageResult.Page - 1 })!, "prev", "GET");
            if (pageResult.Page < pageResult.TotalPages)
                links["next"] = new(Url.Link("SearchExternalPlayers",
                    new { query, page = pageResult.Page + 1 })!, "next", "GET");

            return Ok(paged.WithLinks(links));
        }
        catch (ApiFootballException ex)
        {
            return MapApiFootballError<IReadOnlyList<ApiFootballProfileSummary>>(ex.Error);
        }
    }

    [HttpGet("external/{apiFootballId:int}/seasons", Name = "GetExternalSeasons")]
    public async Task<IActionResult> ExternalSeasons(
        int apiFootballId, CancellationToken ct)
    {
        try
        {
            var seasons = await _apiFootball.GetSeasonsAsync(apiFootballId, ct);
            return Ok(ApiResponse<IReadOnlyList<int>>.Success(seasons));
        }
        catch (ApiFootballException ex)
        {
            return MapApiFootballError<IReadOnlyList<int>>(ex.Error);
        }
    }

    private IActionResult MapApiFootballError<T>(ApiFootballError error)
    {
        int status = error switch
        {
            ApiFootballError.NotFound              => 404,
            ApiFootballError.InvalidParameter      => 400,
            ApiFootballError.SeasonNotAvailable    => 422,
            ApiFootballError.AuthenticationFailed  => 500,
            ApiFootballError.RateLimited           => 503,
            ApiFootballError.DailyQuotaExceeded    => 503,
            ApiFootballError.Timeout               => 504,
            _                                      => 502,
        };
        return StatusCode(status, new ApiResponse<T>
        {
            Status = status,
            Message = error.Message,
        });
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
