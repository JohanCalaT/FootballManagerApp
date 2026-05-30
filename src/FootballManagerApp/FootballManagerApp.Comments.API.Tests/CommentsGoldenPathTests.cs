using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using FootballManagerApp.Comments.Application.Comments.DTOs;
using FootballManagerApp.Shared.Responses;

namespace FootballManagerApp.Comments.API.Tests;

public class CommentsGoldenPathTests : IClassFixture<CommentsApiFactory>
{
    private readonly HttpClient _http;

    public CommentsGoldenPathTests(CommentsApiFactory factory) =>
        _http = factory.CreateClient();

    [Fact]
    public async Task Full_CRUD_golden_path()
    {
        var playerId = Guid.NewGuid();
        var dto = new CreateCommentDto("Johan", "crack absoluto", 5m,
            36.84m, -2.46m, "Almería", "Spain");

        var createReq = new HttpRequestMessage(HttpMethod.Post,
            $"/api/comments/player/{playerId}")
        {
            Content = JsonContent.Create(dto),
        };
        createReq.Headers.Add("X-User-Id", "uid-johan");

        var createResp = await _http.SendAsync(createReq);
        createResp.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await createResp.Content
            .ReadFromJsonAsync<ApiResponse<CommentDto>>();
        var commentId = created!.Data!.Id;
        created.Data.Rating.Should().Be(5m);

        // GET list
        var listResp = await _http.GetAsync($"/api/comments/player/{playerId}");
        listResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var list = await listResp.Content
            .ReadFromJsonAsync<ApiResponse<List<CommentDto>>>();
        list!.Data!.Should().HaveCount(1);

        // DELETE — admin
        var delReq = new HttpRequestMessage(HttpMethod.Delete,
            $"/api/comments/{commentId}");
        delReq.Headers.Add("X-User-Admin", "true");
        var delResp = await _http.SendAsync(delReq);
        delResp.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // After soft-delete, list is empty.
        var afterList = await _http.GetFromJsonAsync<ApiResponse<List<CommentDto>>>(
            $"/api/comments/player/{playerId}");
        afterList!.Data!.Should().BeEmpty();

        // Idempotent DELETE
        var delReq2 = new HttpRequestMessage(HttpMethod.Delete,
            $"/api/comments/{commentId}");
        delReq2.Headers.Add("X-User-Admin", "true");
        var delResp2 = await _http.SendAsync(delReq2);
        delResp2.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task DELETE_without_admin_returns_403()
    {
        var resp = await _http.DeleteAsync($"/api/comments/{Guid.NewGuid()}");
        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task POST_with_invalid_rating_returns_400()
    {
        var dto = new CreateCommentDto("Johan", "test", 7m, null, null, null, null);
        var req = new HttpRequestMessage(HttpMethod.Post,
            $"/api/comments/player/{Guid.NewGuid()}")
        {
            Content = JsonContent.Create(dto),
        };
        req.Headers.Add("X-User-Id", "uid-test");
        var resp = await _http.SendAsync(req);
        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task POST_with_half_step_rating_succeeds()
    {
        var dto = new CreateCommentDto("Johan", "decent", 3.5m, null, null, null, null);
        var req = new HttpRequestMessage(HttpMethod.Post,
            $"/api/comments/player/{Guid.NewGuid()}")
        {
            Content = JsonContent.Create(dto),
        };
        req.Headers.Add("X-User-Id", "uid-halfstar");
        var resp = await _http.SendAsync(req);
        resp.StatusCode.Should().Be(HttpStatusCode.Created);
    }
}
