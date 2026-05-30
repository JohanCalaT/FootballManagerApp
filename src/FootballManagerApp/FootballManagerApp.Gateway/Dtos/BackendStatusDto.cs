namespace FootballManagerApp.Gateway.Dtos;

public sealed record BackendStatusDto(string Active, IEnumerable<string> Available);
