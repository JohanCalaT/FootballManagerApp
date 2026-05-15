using System.Net.Http.Json;
using System.Text.Json;
using FootballManagerApp.Players.Application.Common.DTOs;
using FootballManagerApp.Players.Application.Common.Interfaces;
using FootballManagerApp.Shared.Responses;
using Microsoft.Extensions.Logging;
using Polly.CircuitBreaker;

namespace FootballManagerApp.Players.Infrastructure.Http;

public class CommentsClient : ICommentsClient
{
    private readonly HttpClient _http;
    private readonly ILogger<CommentsClient> _logger;

    public CommentsClient(HttpClient http, ILogger<CommentsClient> logger)
    {
        _http = http;
        _logger = logger;
    }

    public async Task<IEnumerable<CommentDto>> GetByPlayerIdAsync(
        Guid playerId, CancellationToken ct)
    {
        try
        {
            // Comments.API envuelve la respuesta en ApiResponse<T>; desenvolvemos .Data.
            var envelope = await _http.GetFromJsonAsync<ApiResponse<IEnumerable<CommentDto>>>(
                $"api/comments/player/{playerId}", ct);
            return envelope?.Data ?? Array.Empty<CommentDto>();
        }
        catch (BrokenCircuitException ex)
        {
            _logger.LogWarning(ex,
                "Comments circuit open while fetching player {PlayerId}; returning empty list",
                playerId);
            return Array.Empty<CommentDto>();
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex,
                "Comments service unreachable for player {PlayerId}; returning empty list",
                playerId);
            return Array.Empty<CommentDto>();
        }
        catch (TaskCanceledException ex) when (!ct.IsCancellationRequested)
        {
            _logger.LogWarning(ex,
                "Comments service timed out for player {PlayerId}; returning empty list",
                playerId);
            return Array.Empty<CommentDto>();
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex,
                "Comments service returned malformed JSON for player {PlayerId}; returning empty list",
                playerId);
            return Array.Empty<CommentDto>();
        }
    }

    public async Task<bool> DeleteAsync(Guid commentId, CancellationToken ct)
    {
        try
        {
            var response = await _http.DeleteAsync($"api/comments/{commentId}", ct);
            return response.IsSuccessStatusCode;
        }
        catch (BrokenCircuitException ex)
        {
            _logger.LogWarning(ex,
                "Comments circuit open while deleting comment {CommentId}",
                commentId);
            return false;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex,
                "Comments service unreachable while deleting comment {CommentId}",
                commentId);
            return false;
        }
        catch (TaskCanceledException ex) when (!ct.IsCancellationRequested)
        {
            _logger.LogWarning(ex,
                "Comments service timed out while deleting comment {CommentId}",
                commentId);
            return false;
        }
    }

    public async Task<bool> DeleteByPlayerIdAsync(Guid playerId, CancellationToken ct)
    {
        try
        {
            var response = await _http.DeleteAsync($"api/comments/player/{playerId}", ct);
            return response.IsSuccessStatusCode;
        }
        catch (BrokenCircuitException ex)
        {
            _logger.LogWarning(ex,
                "Comments circuit open while cascading delete for player {PlayerId}",
                playerId);
            return false;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex,
                "Comments service unreachable while cascading delete for player {PlayerId}",
                playerId);
            return false;
        }
        catch (TaskCanceledException ex) when (!ct.IsCancellationRequested)
        {
            _logger.LogWarning(ex,
                "Comments service timed out while cascading delete for player {PlayerId}",
                playerId);
            return false;
        }
    }
}
