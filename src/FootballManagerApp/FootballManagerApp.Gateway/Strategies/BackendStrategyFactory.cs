namespace FootballManagerApp.Gateway.Strategies;

public sealed class BackendStrategyFactory
{
    private readonly IReadOnlyDictionary<string, IBackendStrategy> _byName;
    private IBackendStrategy _active;

    public BackendStrategyFactory(IEnumerable<IBackendStrategy> strategies)
    {
        _byName = strategies.ToDictionary(s => s.Name, StringComparer.OrdinalIgnoreCase);

        if (!_byName.TryGetValue("dotnet", out var dflt))
            throw new InvalidOperationException("DotnetStrategy must be registered as the default backend.");

        _active = dflt;
    }

    public IBackendStrategy GetActive() => Volatile.Read(ref _active);

    public IBackendStrategy SetActive(string name)
    {
        if (string.IsNullOrWhiteSpace(name) || !_byName.TryGetValue(name, out var s))
            throw new ArgumentException($"Backend '{name}' no soportado.", nameof(name));

        Volatile.Write(ref _active, s);
        return s;
    }

    public IEnumerable<string> AvailableNames => _byName.Keys;
}
