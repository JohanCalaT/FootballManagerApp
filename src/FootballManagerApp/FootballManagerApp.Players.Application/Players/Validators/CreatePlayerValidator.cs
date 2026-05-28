using FluentValidation;
using FootballManagerApp.Players.Application.Players.DTOs;
using FootballManagerApp.Shared.Constants;

namespace FootballManagerApp.Players.Application.Players.Validators;

internal static class PlayerValidationRules
{
    // Edad razonable para un futbolista profesional: 10–60 años.
    public static bool IsReasonableBirthDate(DateTime? d)
    {
        if (!d.HasValue) return true;
        var today = DateTime.UtcNow.Date;
        var min = today.AddYears(-60);
        var max = today.AddYears(-10);
        var v = d.Value.Date;
        return v >= min && v <= max;
    }
}

public class CreatePlayerValidator : AbstractValidator<CreatePlayerDto>
{
    public CreatePlayerValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MinimumLength(2).MaximumLength(100);
        RuleFor(x => x.Team).NotEmpty().MaximumLength(100);
        RuleFor(x => x.League).NotEmpty().MaximumLength(100);

        RuleFor(x => x.Position)
            .Must(p => p is null || PlayerPosition.All.Contains(p))
            .WithMessage($"Position debe ser uno de: {string.Join(", ", PlayerPosition.All)}");

        RuleFor(x => x.ImageSource)
            .Must(s => s is null || ImageSource.All.Contains(s))
            .WithMessage($"ImageSource debe ser: {string.Join(", ", ImageSource.All)}");

        RuleFor(x => x.ImageUrl).MaximumLength(500);
        RuleFor(x => x.ShirtNumber).InclusiveBetween(1, 99).When(x => x.ShirtNumber.HasValue);

        RuleFor(x => x.PlayerLat).InclusiveBetween(-90m, 90m).When(x => x.PlayerLat.HasValue);
        RuleFor(x => x.PlayerLng).InclusiveBetween(-180m, 180m).When(x => x.PlayerLng.HasValue);

        RuleFor(x => x.BirthDate)
            .Must(PlayerValidationRules.IsReasonableBirthDate)
            .WithMessage("BirthDate fuera de rango razonable (10–60 años)");
    }
}

public class UpdatePlayerValidator : AbstractValidator<UpdatePlayerDto>
{
    // Manual stats only accept the free-tier API-Football seasons since they
    // are surfaced alongside imported stats on the player detail page and
    // must stay comparable.
    private static readonly int[] AllowedSeasons = { 2022, 2023, 2024 };

    public UpdatePlayerValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MinimumLength(2).MaximumLength(100);
        RuleFor(x => x.Team).NotEmpty().MaximumLength(100);
        RuleFor(x => x.League).NotEmpty().MaximumLength(100);

        RuleFor(x => x.Position)
            .Must(p => p is null || PlayerPosition.All.Contains(p))
            .WithMessage($"Position debe ser uno de: {string.Join(", ", PlayerPosition.All)}");

        RuleFor(x => x.ImageUrl).MaximumLength(500);
        RuleFor(x => x.ShirtNumber).InclusiveBetween(1, 99).When(x => x.ShirtNumber.HasValue);

        RuleFor(x => x.PlayerLat).InclusiveBetween(-90m, 90m).When(x => x.PlayerLat.HasValue);
        RuleFor(x => x.PlayerLng).InclusiveBetween(-180m, 180m).When(x => x.PlayerLng.HasValue);

        RuleFor(x => x.BirthDate)
            .Must(PlayerValidationRules.IsReasonableBirthDate)
            .WithMessage("BirthDate fuera de rango razonable (10–60 años)");

        RuleForEach(x => x.Statistics!)
            .ChildRules(stats =>
            {
                stats.RuleFor(s => s.Season)
                    .Must(s => AllowedSeasons.Contains(s))
                    .WithMessage($"Season debe ser una de: {string.Join(", ", AllowedSeasons)}");
                stats.RuleFor(s => s.Appearances).GreaterThanOrEqualTo(0);
                stats.RuleFor(s => s.Goals).GreaterThanOrEqualTo(0);
                stats.RuleFor(s => s.Assists).GreaterThanOrEqualTo(0);
                stats.RuleFor(s => s.Rating)
                    .InclusiveBetween(0m, 10m).When(s => s.Rating.HasValue);
            })
            .When(x => x.Statistics is not null);
    }
}
