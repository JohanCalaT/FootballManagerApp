using FluentValidation;
using FootballManagerApp.Players.Application.Common.Interfaces;
using FootballManagerApp.Players.Application.Players.DTOs;
using FootballManagerApp.Players.Application.Players.Mapping;
using FootballManagerApp.Players.Domain.Entities;
using FootballManagerApp.Shared.Exceptions;
using FootballManagerApp.Shared.Responses;
using FootballManagerApp.Shared.ValueObjects;
using Microsoft.Extensions.Logging;

namespace FootballManagerApp.Players.Application.Players.Handlers;

public class CreatePlayerHandler
{
    private readonly IPlayerRepository _repo;
    private readonly IValidator<CreatePlayerDto> _validator;
    private readonly ILogger<CreatePlayerHandler> _logger;

    public CreatePlayerHandler(
        IPlayerRepository repo,
        IValidator<CreatePlayerDto> validator,
        ILogger<CreatePlayerHandler> logger)
    {
        _repo = repo;
        _validator = validator;
        _logger = logger;
    }

    public async Task<ApiResponse<PlayerDetailDto>> HandleAsync(
        CreatePlayerDto dto,
        string userId,
        decimal? clientLat,
        decimal? clientLng,
        string? clientCity,
        string? clientCountry,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return ApiResponse<PlayerDetailDto>.Unauthorized();

        var validation = await _validator.ValidateAsync(dto, ct);
        if (!validation.IsValid)
        {
            var msg = string.Join("; ", validation.Errors.Select(e => e.ErrorMessage));
            return ApiResponse<PlayerDetailDto>.BadRequest(msg);
        }

        try
        {
            var player = Player.Create(dto.Name, dto.Team, dto.League, userId);

            player.SetPersonalInfo(
                firstName: null, lastName: null,
                nationality: dto.Nationality,
                birthDate: null, birthPlace: null, birthCountry: null,
                height: dto.Height, weight: dto.Weight);

            player.SetFootballInfo(dto.Position, dto.ShirtNumber);
            player.SetImage(dto.ImageUrl, dto.ImageSource);

            if (clientLat.HasValue && clientLng.HasValue)
                player.SetClientGeolocation(Geolocation.Create(
                    clientLat.Value, clientLng.Value, clientCity, clientCountry));

            if (dto.PlayerLat.HasValue && dto.PlayerLng.HasValue)
                player.SetPlayerGeolocation(Geolocation.Create(
                    dto.PlayerLat.Value, dto.PlayerLng.Value,
                    dto.PlayerCity, dto.PlayerCountry));

            if (dto.Statistics is not null)
            {
                foreach (var s in dto.Statistics)
                {
                    var stats = PlayerStatistics.Create(
                        player.Id, s.Season, s.TeamName, s.LeagueName);
                    stats.SetGames(s.Appearances, 0, 0, null, s.Rating, false);
                    stats.SetOffensive(0, 0, s.Goals, s.Assists, 0, 0);
                    player.AddStatistics(stats);
                }
            }

            await _repo.CreateAsync(player, ct);

            _logger.LogInformation("Player created {PlayerId} by {UserId}",
                player.Id, userId);

            return ApiResponse<PlayerDetailDto>.Created(
                player.ToDetail(Array.Empty<Common.DTOs.CommentDto>()),
                "Jugador creado correctamente");
        }
        catch (DomainException ex)
        {
            _logger.LogWarning(ex, "Domain validation failed creating player");
            return ApiResponse<PlayerDetailDto>.BadRequest(ex.Message);
        }
    }
}
