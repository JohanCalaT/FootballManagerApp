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
    string Reason);

public sealed record IdealTeamResponseDto(
    string Formation,
    IdealTeamPlayerDto Goalkeeper,
    IReadOnlyList<IdealTeamPlayerDto> Defenders,
    IReadOnlyList<IdealTeamPlayerDto> Midfielders,
    IReadOnlyList<IdealTeamPlayerDto> Attackers,
    string GeneralJustification);
