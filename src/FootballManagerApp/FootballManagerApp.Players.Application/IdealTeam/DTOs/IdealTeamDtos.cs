namespace FootballManagerApp.Players.Application.IdealTeam.DTOs;

public record IdealTeamPlayerDto(
    Guid PlayerId,
    string Name,
    string Position,
    string Reason);

public record IdealTeamResponseDto(
    string Formation,
    IdealTeamPlayerDto Goalkeeper,
    IEnumerable<IdealTeamPlayerDto> Defenders,
    IEnumerable<IdealTeamPlayerDto> Midfielders,
    IEnumerable<IdealTeamPlayerDto> Attackers,
    string GeneralJustification);
