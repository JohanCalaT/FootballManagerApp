namespace FootballManagerApp.Players.Application.IdealTeam.DTOs;

/// <summary>
/// Jugador situado en el campo dentro del equipo ideal generado por Gemini.
/// La línea (goalkeeper/defenders/midfielders/attackers) queda implícita en
/// la clave que lo agrupa en IdealTeamResponseDto.
/// </summary>
public sealed record IdealTeamPlayerDto(
    Guid Id,
    string Name,
    string Team,
    string Position,   // GK | CB | LB | RB | LWB | RWB | CDM | CM | CAM | LM | RM | LW | RW | CF | ST
    decimal X,         // 0..1 — 0=izquierda, 1=derecha
    decimal Y,         // 0..1 — 0=portería propia, 1=portería rival
    string Reason,
    // FUT-scale attributes (0..99) emitted by Gemini and consumed by the
    // frontend card. For goalkeepers they map to DIV/HAN/KIC/REF/SPD/POS.
    int Overall = 0,
    int Pac = 0,
    int Sho = 0,
    int Pas = 0,
    int Dri = 0,
    int Def = 0,
    int Phy = 0,
    // Enriched from the database by Id after parsing (never trusted from Gemini).
    string? ImageUrl = null,
    string? Nationality = null);

public sealed record IdealTeamResponseDto(
    string Formation,
    IdealTeamPlayerDto Goalkeeper,
    IReadOnlyList<IdealTeamPlayerDto> Defenders,
    IReadOnlyList<IdealTeamPlayerDto> Midfielders,
    IReadOnlyList<IdealTeamPlayerDto> Attackers,
    string GeneralJustification);
