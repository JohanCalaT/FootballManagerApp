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
    }
}
