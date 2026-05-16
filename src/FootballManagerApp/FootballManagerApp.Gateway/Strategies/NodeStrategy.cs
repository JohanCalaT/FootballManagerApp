namespace FootballManagerApp.Gateway.Strategies;

public sealed class NodeStrategy : IBackendStrategy
{
    public string Name => "node";
    public string PlayersClusterId => "node-backend";
    public string CommentsClusterId => "node-backend";
}
