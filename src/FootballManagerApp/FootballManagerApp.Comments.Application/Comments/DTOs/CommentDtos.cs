namespace FootballManagerApp.Comments.Application.Comments.DTOs;

/// <summary>
/// Nested geolocation shape for the comments wire format. Mirrors the
/// frontend's `Geolocation` interface and the `GeolocationDto` already
/// used by Players — keeping the JSON shape consistent across both
/// microservices makes the X-Backend toggle transparent.
/// </summary>
public record GeolocationDto(
    decimal Lat,
    decimal Lng,
    string? City,
    string? Country);

public record CommentDto(
    Guid Id,
    Guid PlayerId,
    string Author,
    string Text,
    decimal Rating,
    DateTime CreatedAt,
    // Added so the response matches the Node backend, which has always
    // exposed these. Defaulted nullable so existing positional callers
    // keep compiling. The frontend reads both fields — admin UIs use
    // CreatedByUserId for filtering "my comments", and ClientGeolocation
    // surfaces a small map pin next to the comment author.
    string? CreatedByUserId = null,
    GeolocationDto? ClientGeolocation = null);

public record CreateCommentDto(
    string Author,
    string Text,
    decimal Rating,
    decimal? ClientLat,
    decimal? ClientLng,
    string? ClientCity,
    string? ClientCountry,
    // Nested geolocation — preferred shape the frontend sends. When both
    // forms are present (legacy + nested), the nested one wins. Defaulted
    // nullable so existing positional callers (validators, fixtures) keep
    // working unchanged.
    GeolocationDto? ClientGeolocation = null);
