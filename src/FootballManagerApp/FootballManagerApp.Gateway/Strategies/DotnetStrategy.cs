namespace FootballManagerApp.Gateway.Strategies;

public sealed class DotnetStrategy : IBackendStrategy
{
    public string Name => "dotnet";
    public string PlayersClusterId => "players-api";
    public string CommentsClusterId => "comments-api";
}
