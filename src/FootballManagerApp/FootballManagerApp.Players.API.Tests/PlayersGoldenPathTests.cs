using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using FootballManagerApp.Players.Application.Players.DTOs;
using FootballManagerApp.Shared.Responses;

namespace FootballManagerApp.Players.API.Tests;

public class PlayersGoldenPathTests : IClassFixture<PlayersApiFactory>
{
    private readonly HttpClient _http;

    public PlayersGoldenPathTests(PlayersApiFactory factory) =>
        _http = factory.CreateClient();

    private static CreatePlayerDto NewPedri() =>
        new("Pedri González", "FC Barcelona", "La Liga",
            Position: "Midfielder",
            ImageUrl: null, ImageSource: null,
            Nationality: "Spain", BirthDate: new DateTime(2002, 11, 25),
            Height: "174 cm", Weight: "60 kg", ShirtNumber: 8,
            PlayerLat: null, PlayerLng: null,
            PlayerCity: null, PlayerCountry: null,
            Statistics: null);

    [Fact]
    public async Task Full_CRUD_golden_path()
    {
        // CREATE
        var createReq = new HttpRequestMessage(HttpMethod.Post, "/api/players")
        {
            Content = JsonContent.Create(NewPedri()),
        };
        createReq.Headers.Add("X-User-Id", "uid-test");

        var createResp = await _http.SendAsync(createReq);
        createResp.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await createResp.Content
            .ReadFromJsonAsync<ApiResponse<PlayerDetailDto>>();
        created!.Data!.Name.Should().Be("Pedri González");
        var id = created.Data.Id;

        // GET LIST
        var list = await _http.GetFromJsonAsync<PagedResponse<PlayerListItemDto>>(
            "/api/players?page=1&limit=10");
        list!.Total.Should().BeGreaterThanOrEqualTo(1);
        list._links_self_should_not_be_empty();

        // GET BY ID — etag is exposed
        var detailResp = await _http.GetAsync($"/api/players/{id}");
        detailResp.StatusCode.Should().Be(HttpStatusCode.OK);
        detailResp.Headers.ETag.Should().NotBeNull();
        var detail = await detailResp.Content
            .ReadFromJsonAsync<ApiResponse<PlayerDetailDto>>();
        detail!.Data!.Comments.Should().BeEmpty(); // Comments fake → []

        // UPDATE — requires admin
        var update = new UpdatePlayerDto("Pedro González López", "FC Barcelona", "La Liga",
            Position: "Midfielder",
            ImageUrl: null, Nationality: "Spain", BirthDate: new DateTime(2002, 11, 25),
            Height: "174 cm", Weight: "60 kg", ShirtNumber: 8,
            PlayerLat: null, PlayerLng: null, PlayerCity: null, PlayerCountry: null);
        var putReq = new HttpRequestMessage(HttpMethod.Put, $"/api/players/{id}")
        {
            Content = JsonContent.Create(update),
        };
        putReq.Headers.Add("X-User-Admin", "true");
        var putResp = await _http.SendAsync(putReq);
        putResp.StatusCode.Should().Be(HttpStatusCode.OK);

        // DELETE — requires admin, idempotent 204
        var delReq = new HttpRequestMessage(HttpMethod.Delete, $"/api/players/{id}");
        delReq.Headers.Add("X-User-Admin", "true");
        var delResp = await _http.SendAsync(delReq);
        delResp.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // Repeat DELETE → also 204 (idempotent)
        var delReq2 = new HttpRequestMessage(HttpMethod.Delete, $"/api/players/{id}");
        delReq2.Headers.Add("X-User-Admin", "true");
        var delResp2 = await _http.SendAsync(delReq2);
        delResp2.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // Soft-deleted: GET returns 404
        var getAfter = await _http.GetAsync($"/api/players/{id}");
        getAfter.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task POST_without_user_returns_401()
    {
        var resp = await _http.PostAsJsonAsync("/api/players", NewPedri());
        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task PUT_without_admin_returns_403()
    {
        var req = new HttpRequestMessage(HttpMethod.Put, $"/api/players/{Guid.NewGuid()}")
        {
            Content = JsonContent.Create(NewPedri()),
        };
        req.Headers.Add("X-User-Id", "uid-test");
        var resp = await _http.SendAsync(req);
        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GET_list_emits_per_item_links_conditioned_by_admin()
    {
        // Seed one player with a unique name/team so this spec does not
        // collide with the other tests that reuse Pedri (the test class is
        // backed by a single shared PlayersApiFactory).
        var seed = new CreatePlayerDto(
            $"Hateoas Seed {Guid.NewGuid():N}", "Test FC", "Test League",
            Position: "Midfielder",
            ImageUrl: null, ImageSource: null,
            Nationality: null, BirthDate: null,
            Height: null, Weight: null, ShirtNumber: null,
            PlayerLat: null, PlayerLng: null,
            PlayerCity: null, PlayerCountry: null,
            Statistics: null);
        var createReq = new HttpRequestMessage(HttpMethod.Post, "/api/players")
        {
            Content = JsonContent.Create(seed),
        };
        createReq.Headers.Add("X-User-Id", "uid-hateoas");
        var createResp = await _http.SendAsync(createReq);
        createResp.StatusCode.Should().Be(HttpStatusCode.Created);

        // Anonymous list → each item carries self but neither update nor delete.
        var anonList = await _http.GetFromJsonAsync<PagedResponse<PlayerListItemDto>>(
            "/api/players?page=1&limit=10");
        anonList!.Data.Should().NotBeEmpty();
        var anonItem = anonList.Data.First();
        anonItem.Links.Should().NotBeNull();
        anonItem.Links!.Should().ContainKey("self");
        anonItem.Links.Should().NotContainKey("update");
        anonItem.Links.Should().NotContainKey("delete");

        // Admin list → same self plus update + delete affordances.
        var adminReq = new HttpRequestMessage(HttpMethod.Get, "/api/players?page=1&limit=10");
        adminReq.Headers.Add("X-User-Admin", "true");
        var adminResp = await _http.SendAsync(adminReq);
        adminResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var adminList = await adminResp.Content
            .ReadFromJsonAsync<PagedResponse<PlayerListItemDto>>();
        var adminItem = adminList!.Data.First();
        adminItem.Links.Should().NotBeNull();
        adminItem.Links!.Should().ContainKey("self");
        adminItem.Links.Should().ContainKey("update");
        adminItem.Links.Should().ContainKey("delete");
        adminItem.Links["update"].Method.Should().Be("PUT");
        adminItem.Links["delete"].Method.Should().Be("DELETE");
    }

    [Fact]
    public async Task POST_duplicate_name_and_team_returns_409()
    {
        var req1 = new HttpRequestMessage(HttpMethod.Post, "/api/players")
        {
            Content = JsonContent.Create(NewPedri()),
        };
        req1.Headers.Add("X-User-Id", "uid-test");
        var r1 = await _http.SendAsync(req1);
        r1.StatusCode.Should().Be(HttpStatusCode.Created);

        var req2 = new HttpRequestMessage(HttpMethod.Post, "/api/players")
        {
            Content = JsonContent.Create(NewPedri()),
        };
        req2.Headers.Add("X-User-Id", "uid-test");
        var r2 = await _http.SendAsync(req2);
        r2.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }
}

internal static class PagedResponseAssertions
{
    public static void _links_self_should_not_be_empty<T>(this PagedResponse<T> r) =>
        r.Links.Should().ContainKey("self");
}
