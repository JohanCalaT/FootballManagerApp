using System.Text.Json;
using FootballManagerApp.Players.Application.Common.Exceptions;
using FootballManagerApp.Players.Application.Common.Interfaces;
using FootballManagerApp.Players.Application.IdealTeam.DTOs;
using FootballManagerApp.Players.Application.Players.DTOs;
using FootballManagerApp.Shared.Responses;
using Microsoft.Extensions.Logging;

namespace FootballManagerApp.Players.Application.IdealTeam.Handlers;

public sealed class GenerateIdealTeamHandler
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private readonly IPlayerRepository _repo;
    private readonly IGeminiService _gemini;
    private readonly ILogger<GenerateIdealTeamHandler> _log;

    public GenerateIdealTeamHandler(
        IPlayerRepository repo,
        IGeminiService gemini,
        ILogger<GenerateIdealTeamHandler> log)
    {
        _repo = repo;
        _gemini = gemini;
        _log = log;
    }

    public async Task<ApiResponse<IdealTeamResponseDto>> HandleAsync(
        GenerateIdealTeamDto dto,
        string userId,
        CancellationToken ct)
    {
        // 1. Formación válida
        if (!IdealTeamFormations.IsValid(dto.Formation))
            return ApiResponse<IdealTeamResponseDto>.BadRequest(
                $"Formación inválida. Valores permitidos: {IdealTeamFormations.Joined}");

        // 2. Cargar jugadores
        var players = await _repo.GetAllForIdealTeamAsync(ct);

        if (players.Count < 11)
            return ApiResponse<IdealTeamResponseDto>.BadRequest(
                "No hay jugadores suficientes (mínimo 11)");

        // No validamos por línea — el prompt indica a Gemini que adapte
        // jugadores de posición similar (regla 5). Una lista vacía aparece
        // como "(ninguno)" en el prompt; Gemini se encargará de improvisar.
        var byLine = players
            .GroupBy(p => p.Position)
            .ToDictionary(g => g.Key, g => (IReadOnlyList<PlayerForPromptDto>)g.ToList());

        IReadOnlyList<PlayerForPromptDto> Get(string line) =>
            byLine.TryGetValue(line, out var l) ? l : Array.Empty<PlayerForPromptDto>();

        var gks  = Get("Goalkeeper");
        var defs = Get("Defender");
        var mids = Get("Midfielder");
        var atts = Get("Attacker");

        // 3. Construir prompt y llamar a Gemini
        var prompt = IdealTeamPrompt.Build(dto.Formation, gks, defs, mids, atts);

        _log.LogInformation(
            "Generando equipo ideal {Formation} para userId={UserId} con {Total} jugadores",
            dto.Formation, userId, players.Count);

        var raw = await _gemini.GenerateIdealTeamAsync(prompt, ct);

        // 4. Parsear JSON
        IdealTeamResponseDto? parsed;
        try
        {
            parsed = JsonSerializer.Deserialize<IdealTeamResponseDto>(raw, JsonOpts);
        }
        catch (JsonException ex)
        {
            throw new GeminiUnavailableException(
                "Gemini returned malformed JSON for ideal team", ex);
        }

        if (parsed is null)
            throw new GeminiUnavailableException("Gemini returned null payload");

        // 5. Validar IDs contra la BD
        var allIds = players.Select(p => p.Id).ToHashSet();
        foreach (var p in EnumerateAll(parsed))
        {
            if (!allIds.Contains(p.Id.ToString()))
                throw new GeminiUnavailableException(
                    $"Gemini returned unknown player id: {p.Id}");
        }

        // 6. Self link
        return ApiResponse<IdealTeamResponseDto>
            .Success(parsed, "Equipo Ideal generado correctamente")
            .WithLinks(new Dictionary<string, HateoasLink>
            {
                ["self"] = new("/api/ideal-team", "self", "POST"),
            });
    }

    private static IEnumerable<IdealTeamPlayerDto> EnumerateAll(
        IdealTeamResponseDto t)
    {
        yield return t.Goalkeeper;
        foreach (var d in t.Defenders) yield return d;
        foreach (var m in t.Midfielders) yield return m;
        foreach (var a in t.Attackers) yield return a;
    }
}
