namespace FootballManagerApp.Players.Application.Common.ApiFootball;

public sealed class ApiFootballException : Exception
{
    public ApiFootballError Error { get; }

    public ApiFootballException(ApiFootballError error)
        : base(error.Message)
    {
        Error = error;
    }
}
