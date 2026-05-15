using FluentValidation;
using FootballManagerApp.Comments.Application.Comments.DTOs;

namespace FootballManagerApp.Comments.Application.Comments.Validators;

public class CreateCommentValidator : AbstractValidator<CreateCommentDto>
{
    public CreateCommentValidator()
    {
        RuleFor(x => x.Author).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Text).NotEmpty().MaximumLength(1000);
        RuleFor(x => x.Rating).InclusiveBetween(0, 5);

        RuleFor(x => x.ClientLat).InclusiveBetween(-90m, 90m).When(x => x.ClientLat.HasValue);
        RuleFor(x => x.ClientLng).InclusiveBetween(-180m, 180m).When(x => x.ClientLng.HasValue);
    }
}
