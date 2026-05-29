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

        // 2b. Portero obligatorio: sin porteros en BD no se forma equipo.
        if (gks.Count == 0)
            return ApiResponse<IdealTeamResponseDto>.BadRequest(
                "No hay porteros disponibles para formar el equipo");

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

        if (parsed.Goalkeeper is null)
            throw new GeminiUnavailableException("Gemini returned no goalkeeper");

        // 5. La salida debe ser un once completo (1 portero + 10 de campo).
        var total = 1
            + parsed.Defenders.Count
            + parsed.Midfielders.Count
            + parsed.Attackers.Count;
        if (total != 11)
            throw new GeminiUnavailableException(
                $"Gemini returned {total} players, expected 11");

        // 6. Validar IDs contra la BD y enriquecer con datos reales.
        var meta = players.ToDictionary(p => p.Id, p => p);
        foreach (var p in EnumerateAll(parsed))
        {
            if (!meta.ContainsKey(p.Id.ToString()))
                throw new GeminiUnavailableException(
                    $"Gemini returned unknown player id: {p.Id}");
        }

        var enriched = parsed with
        {
            Goalkeeper  = Enrich(parsed.Goalkeeper, meta),
            Defenders   = parsed.Defenders.Select(d => Enrich(d, meta)).ToList(),
            Midfielders = parsed.Midfielders.Select(m => Enrich(m, meta)).ToList(),
            Attackers   = parsed.Attackers.Select(a => Enrich(a, meta)).ToList(),
        };

        // 7. Self link
        return ApiResponse<IdealTeamResponseDto>
            .Success(enriched, "Equipo Ideal generado correctamente")
            .WithLinks(new Dictionary<string, HateoasLink>
            {
                ["self"] = new("/api/ideal-team", "self", "POST"),
            });
    }

    /// <summary>
    /// Clamps the AI attributes to the FUT 0..99 range and overlays the real
    /// portrait + nationality from the database (never trusted from Gemini).
    /// </summary>
    private static IdealTeamPlayerDto Enrich(
        IdealTeamPlayerDto p,
        IReadOnlyDictionary<string, PlayerForPromptDto> meta)
    {
        meta.TryGetValue(p.Id.ToString(), out var m);
        return p with
        {
            Overall     = Math.Clamp(p.Overall, 0, 99),
            Pac         = Math.Clamp(p.Pac, 0, 99),
            Sho         = Math.Clamp(p.Sho, 0, 99),
            Pas         = Math.Clamp(p.Pas, 0, 99),
            Dri         = Math.Clamp(p.Dri, 0, 99),
            Def         = Math.Clamp(p.Def, 0, 99),
            Phy         = Math.Clamp(p.Phy, 0, 99),
            ImageUrl    = m?.ImageUrl,
            Nationality = m?.Nationality,
        };
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
