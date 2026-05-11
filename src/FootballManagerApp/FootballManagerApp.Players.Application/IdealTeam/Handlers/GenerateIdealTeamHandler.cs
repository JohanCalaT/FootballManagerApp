using FootballManagerApp.Players.Application.IdealTeam.DTOs;
using FootballManagerApp.Players.Application.Players.DTOs;
using FootballManagerApp.Shared.Responses;

namespace FootballManagerApp.Players.Application.IdealTeam.Handlers;

public class GenerateIdealTeamHandler
{
    // TODO Fase 2: inyectar IPlayerRepository y IGeminiService

    public Task<ApiResponse<IdealTeamResponseDto>> HandleAsync(
        GenerateIdealTeamDto dto,
        string userId,
        CancellationToken ct)
    {
        throw new NotImplementedException("Implementar en Fase 2");
    }
}
