using System.Net;

namespace FootballManagerApp.Players.Infrastructure.Tests.ExternalServices.ApiFootball;

internal sealed class StubHttpMessageHandler : HttpMessageHandler
{
    public List<HttpRequestMessage> Calls { get; } = new();

    private readonly Func<HttpRequestMessage, HttpResponseMessage> _respond;

    public StubHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> respond)
        => _respond = respond;

    public static StubHttpMessageHandler FromFixture(string filename) =>
        new(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(
                LoadFixture(filename),
                System.Text.Encoding.UTF8,
                "application/json")
        });

    public static StubHttpMessageHandler FromStatusOnly(HttpStatusCode status) =>
        new(_ => new HttpResponseMessage(status));

    public static string LoadFixture(string filename)
    {
        var path = Path.Combine(
            AppContext.BaseDirectory,
            "ExternalServices", "ApiFootball", "Fixtures", filename);
        if (!File.Exists(path))
            throw new FileNotFoundException(
                $"Fixture no encontrada en {path}. " +
                "Verifica que el .csproj tiene <None Update=...> con CopyToOutputDirectory.");
        return File.ReadAllText(path);
    }

    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken ct)
    {
        Calls.Add(request);
        return Task.FromResult(_respond(request));
    }
}
