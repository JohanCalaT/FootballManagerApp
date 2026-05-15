using FluentValidation;
using FootballManagerApp.Players.Application.Common.DTOs;
using FootballManagerApp.Players.Application.Common.Interfaces;
using FootballManagerApp.Players.Application.Players.DTOs;
using FootballManagerApp.Players.Application.Players.Mapping;
using FootballManagerApp.Shared.Exceptions;
using FootballManagerApp.Shared.Responses;
using FootballManagerApp.Shared.ValueObjects;
using Microsoft.Extensions.Logging;

namespace FootballManagerApp.Players.Application.Players.Handlers;

public class UpdatePlayerHandler
{
    private readonly IPlayerRepository _repo;
    private readonly IValidator<UpdatePlayerDto> _validator;
    private readonly ILogger<UpdatePlayerHandler> _logger;

    public UpdatePlayerHandler(
        IPlayerRepository repo,
        IValidator<UpdatePlayerDto> validator,
        ILogger<UpdatePlayerHandler> logger)
    {
        _repo = repo;
        _validator = validator;
        _logger = logger;
    }

    public async Task<ApiResponse<PlayerDetailDto>> HandleAsync(
        Guid id, UpdatePlayerDto dto, CancellationToken ct)
    {
        var validation = await _validator.ValidateAsync(dto, ct);
        if (!validation.IsValid)
        {
            var msg = string.Join("; ", validation.Errors.Select(e => e.ErrorMessage));
            return ApiResponse<PlayerDetailDto>.BadRequest(msg);
        }

        var player = await _repo.GetByIdAsync(id, ct);
        if (player is null)
            return ApiResponse<PlayerDetailDto>.NotFound($"Jugador {id} no encontrado");

        try
        {
            player.Rename(dto.Name);
            player.UpdateTeamAndLeague(dto.Team, dto.League);
            player.SetPersonalInfo(
                firstName: null, lastName: null,
                nationality: dto.Nationality,
                birthDate: null, birthPlace: null, birthCountry: null,
                height: dto.Height, weight: dto.Weight);
            player.SetFootballInfo(dto.Position, dto.ShirtNumber);
            player.SetImage(dto.ImageUrl, player.ImageSource);

            if (dto.PlayerLat.HasValue && dto.PlayerLng.HasValue)
                player.SetPlayerGeolocation(Geolocation.Create(
                    dto.PlayerLat.Value, dto.PlayerLng.Value,
                    dto.PlayerCity, dto.PlayerCountry));

            await _repo.UpdateAsync(player, ct);

            _logger.LogInformation("Player updated {PlayerId}", id);

            return ApiResponse<PlayerDetailDto>.Success(
                player.ToDetail(Array.Empty<CommentDto>()),
                "Jugador actualizado correctamente");
        }
        catch (DomainException ex)
        {
            _logger.LogWarning(ex, "Domain validation failed updating player {PlayerId}", id);
            return ApiResponse<PlayerDetailDto>.BadRequest(ex.Message);
        }
    }
}
