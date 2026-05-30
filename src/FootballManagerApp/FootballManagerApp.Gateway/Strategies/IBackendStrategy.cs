namespace FootballManagerApp.Gateway.Strategies;

public interface IBackendStrategy
{
    string Name { get; }
    string PlayersClusterId { get; }
    string CommentsClusterId { get; }
}
