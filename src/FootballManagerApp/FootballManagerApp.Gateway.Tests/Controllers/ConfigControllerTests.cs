using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using FootballManagerApp.Gateway.Dtos;
using Microsoft.AspNetCore.Mvc.Testing;

namespace FootballManagerApp.Gateway.Tests.Controllers;

public class ConfigControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public ConfigControllerTests(WebApplicationFactory<Program> factory) =>
        _factory = factory;

    [Fact]
    public async Task GetBackend_ReturnsActive_200()
    {
        // Each test gets its own factory scope to isolate the singleton state
        await using var factory = _factory.WithWebHostBuilder(_ => { });
        var client = factory.CreateClient();
        // Reset to default for this isolated factory
        await client.PostAsJsonAsync("/config/backend", new SetBackendRequest("dotnet"));

        var response = await client.GetAsync("/config/backend");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<BackendStatusDto>();
        body!.Active.Should().Be("dotnet");
        body.Available.Should().BeEquivalentTo("dotnet", "node");
    }

    [Fact]
    public async Task SetBackend_Dotnet_Returns200()
    {
        await using var factory = _factory.WithWebHostBuilder(_ => { });
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/config/backend",
            new SetBackendRequest("dotnet"));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<BackendStatusDto>();
        body!.Active.Should().Be("dotnet");
    }

    [Fact]
    public async Task SetBackend_Node_Returns200()
    {
        await using var factory = _factory.WithWebHostBuilder(_ => { });
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/config/backend",
            new SetBackendRequest("node"));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<BackendStatusDto>();
        body!.Active.Should().Be("node");
    }

    [Fact]
    public async Task SetBackend_Invalid_Returns400()
    {
        await using var factory = _factory.WithWebHostBuilder(_ => { });
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/config/backend",
            new SetBackendRequest("foo"));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task SetBackend_EmptyBody_Returns400()
    {
        await using var factory = _factory.WithWebHostBuilder(_ => { });
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/config/backend",
            new SetBackendRequest(""));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
