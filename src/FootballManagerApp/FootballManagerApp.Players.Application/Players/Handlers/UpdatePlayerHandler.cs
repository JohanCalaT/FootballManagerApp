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
        Guid id, UpdatePlayerDto dto, int? ifMatchVersion, CancellationToken ct)
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

        // Pre-check optimista: si el cliente envió If-Match y no coincide, 412.
        if (ifMatchVersion.HasValue && ifMatchVersion.Value != player.Version)
            return new ApiResponse<PlayerDetailDto>
            {
                Status = 412,
                Message = $"Precondition Failed: la versión actual es {player.Version}, " +
                          $"recibida {ifMatchVersion.Value}",
            };

        try
        {
            // Biographical fields are immutable once a player came from
            // API-Football — the API is the source of truth there. The
            // frontend hides the inputs but the handler enforces the lock
            // server-side so any direct PUT respects it too. The unlock
            // mechanism is the future Re-import endpoint (PR 4), not a
            // direct edit.
            var isImported = player.ApiFootballId.HasValue;
            if (!isImported)
            {
                player.Rename(dto.Name);
                player.SetPersonalInfo(
                    firstName: dto.FirstName,
                    lastName: dto.LastName,
                    nationality: dto.Nationality,
                    birthDate: dto.BirthDate,
                    birthPlace: dto.BirthPlace,
                    birthCountry: dto.BirthCountry,
                    height: dto.Height,
                    weight: dto.Weight);
            }
            else
            {
                // Imported players still let the admin edit physical-only
                // fields (height/weight change with age) but keep the
                // identity locked.
                player.SetPersonalInfo(
                    firstName: player.FirstName,
                    lastName: player.LastName,
                    nationality: player.Nationality,
                    birthDate: player.BirthDate,
                    birthPlace: player.BirthPlace,
                    birthCountry: player.BirthCountry,
                    height: dto.Height,
                    weight: dto.Weight);
            }

            player.UpdateTeamAndLeague(dto.Team, dto.League);
            player.SetFootballInfo(dto.Position, dto.ShirtNumber);
            if (dto.Injured.HasValue) player.MarkInjured(dto.Injured.Value);
            player.SetImage(dto.ImageUrl, dto.ImageSource ?? player.ImageSource);

            // Geolocation: prefer the nested DTO shape (frontend native),
            // fall back to the legacy flat fields for any older caller.
            if (dto.PlayerGeolocation is not null)
                player.SetPlayerGeolocation(Geolocation.Create(
                    dto.PlayerGeolocation.Lat, dto.PlayerGeolocation.Lng,
                    dto.PlayerGeolocation.City, dto.PlayerGeolocation.Country));
            else if (dto.PlayerLat.HasValue && dto.PlayerLng.HasValue)
                player.SetPlayerGeolocation(Geolocation.Create(
                    dto.PlayerLat.Value, dto.PlayerLng.Value,
                    dto.PlayerCity, dto.PlayerCountry));

            if (dto.ClientGeolocation is not null)
                player.SetClientGeolocation(Geolocation.Create(
                    dto.ClientGeolocation.Lat, dto.ClientGeolocation.Lng,
                    dto.ClientGeolocation.City, dto.ClientGeolocation.Country));

            await _repo.UpdateAsync(player, ct);

            _logger.LogInformation("Player updated {PlayerId} v{Version}", id, player.Version);

            return ApiResponse<PlayerDetailDto>.Success(
                player.ToDetail(Array.Empty<CommentDto>()),
                "Jugador actualizado correctamente");
        }
        catch (ConcurrencyConflictException ex)
        {
            _logger.LogWarning(ex,
                "Concurrency conflict updating player {PlayerId}", id);
            return ApiResponse<PlayerDetailDto>.Conflict(
                "Conflicto de concurrencia: otro proceso modificó el jugador. " +
                "Recarga y vuelve a intentarlo.");
        }
        catch (DomainException ex)
        {
            _logger.LogWarning(ex, "Domain validation failed updating player {PlayerId}", id);
            return ApiResponse<PlayerDetailDto>.BadRequest(ex.Message);
        }
    }
}
