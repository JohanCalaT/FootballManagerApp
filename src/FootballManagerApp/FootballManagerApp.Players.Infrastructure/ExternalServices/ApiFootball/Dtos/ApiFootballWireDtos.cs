using System.Text.Json;
using System.Text.Json.Serialization;

namespace FootballManagerApp.Players.Infrastructure.ExternalServices.ApiFootball.Dtos;

// Wire DTOs — espejo exacto del JSON de https://v3.football.api-sports.io
// Incluye los typos del API ("appearences", "commited") respetados.

public sealed class ApiFootballEnvelope<T>
{
    [JsonPropertyName("get")]      public string Get { get; init; } = string.Empty;
    [JsonPropertyName("errors")]   public JsonElement? Errors { get; init; }
    [JsonPropertyName("results")]  public int Results { get; init; }
    [JsonPropertyName("paging")]   public ApiFootballPaging? Paging { get; init; }
    [JsonPropertyName("response")] public List<T> Response { get; init; } = [];
}

public sealed class ApiFootballPaging
{
    [JsonPropertyName("current")] public int Current { get; init; }
    [JsonPropertyName("total")]   public int Total { get; init; }
}

public sealed class ApiFootballProfileResponse
{
    [JsonPropertyName("player")] public ApiFootballPlayerDto Player { get; init; } = new();
}

public sealed class ApiFootballStatsResponse
{
    [JsonPropertyName("player")]     public ApiFootballPlayerDto Player { get; init; } = new();
    [JsonPropertyName("statistics")] public List<ApiFootballStatisticsDto> Statistics { get; init; } = [];
}

public sealed class ApiFootballPlayerDto
{
    [JsonPropertyName("id")]          public int Id { get; init; }
    [JsonPropertyName("name")]        public string Name { get; init; } = string.Empty;
    [JsonPropertyName("firstname")]   public string? FirstName { get; init; }
    [JsonPropertyName("lastname")]    public string? LastName { get; init; }
    [JsonPropertyName("age")]         public int? Age { get; init; }
    [JsonPropertyName("birth")]       public ApiFootballBirthDto? Birth { get; init; }
    [JsonPropertyName("nationality")] public string? Nationality { get; init; }
    [JsonPropertyName("height")]      public string? Height { get; init; } // "170 cm"
    [JsonPropertyName("weight")]      public string? Weight { get; init; } // "67 kg"
    [JsonPropertyName("number")]      public int? Number { get; init; }
    [JsonPropertyName("position")]    public string? Position { get; init; }
    [JsonPropertyName("injured")]     public bool? Injured { get; init; }
    [JsonPropertyName("photo")]       public string? Photo { get; init; }
}

public sealed class ApiFootballBirthDto
{
    [JsonPropertyName("date")]    public string? Date { get; init; }    // "YYYY-MM-DD"
    [JsonPropertyName("place")]   public string? Place { get; init; }
    [JsonPropertyName("country")] public string? Country { get; init; }
}

public sealed class ApiFootballStatisticsDto
{
    [JsonPropertyName("team")]        public ApiFootballTeamDto Team { get; init; } = new();
    [JsonPropertyName("league")]      public ApiFootballLeagueDto League { get; init; } = new();
    [JsonPropertyName("games")]       public ApiFootballGamesDto? Games { get; init; }
    [JsonPropertyName("substitutes")] public ApiFootballSubstitutesDto? Substitutes { get; init; }
    [JsonPropertyName("shots")]       public ApiFootballShotsDto? Shots { get; init; }
    [JsonPropertyName("goals")]       public ApiFootballGoalsDto? Goals { get; init; }
    [JsonPropertyName("passes")]      public ApiFootballPassesDto? Passes { get; init; }
    [JsonPropertyName("tackles")]     public ApiFootballTacklesDto? Tackles { get; init; }
    [JsonPropertyName("duels")]       public ApiFootballDuelsDto? Duels { get; init; }
    [JsonPropertyName("dribbles")]    public ApiFootballDribblesDto? Dribbles { get; init; }
    [JsonPropertyName("fouls")]       public ApiFootballFoulsDto? Fouls { get; init; }
    [JsonPropertyName("cards")]       public ApiFootballCardsDto? Cards { get; init; }
    [JsonPropertyName("penalty")]     public ApiFootballPenaltyDto? Penalty { get; init; }
}

public sealed class ApiFootballTeamDto
{
    // En la práctica siempre llega, pero lo dejamos nullable defensivamente.
    [JsonPropertyName("id")]   public int? Id { get; init; }
    [JsonPropertyName("name")] public string Name { get; init; } = string.Empty;
    [JsonPropertyName("logo")] public string? Logo { get; init; }
}

public sealed class ApiFootballLeagueDto
{
    // ⚠️ league.id PUEDE ser null en torneos no oficiales (King's Cup, Friendlies).
    [JsonPropertyName("id")]      public int? Id { get; init; }
    [JsonPropertyName("name")]    public string Name { get; init; } = string.Empty;
    [JsonPropertyName("country")] public string? Country { get; init; }
    [JsonPropertyName("logo")]    public string? Logo { get; init; }
    [JsonPropertyName("flag")]    public string? Flag { get; init; }
    [JsonPropertyName("season")]  public int Season { get; init; }
}

public sealed class ApiFootballGamesDto
{
    // ⚠️ Typo en API — "appearences" no "appearances"
    [JsonPropertyName("appearences")] public int? Appearances { get; init; }
    [JsonPropertyName("lineups")]     public int? Lineups { get; init; }
    [JsonPropertyName("minutes")]     public int? Minutes { get; init; }
    [JsonPropertyName("position")]    public string? Position { get; init; }
    // ⚠️ Viene como string "8.103125" — usar ApiFootballParsers.ParseRating
    [JsonPropertyName("rating")]      public string? Rating { get; init; }
    [JsonPropertyName("captain")]     public bool Captain { get; init; }
}

public sealed class ApiFootballSubstitutesDto
{
    [JsonPropertyName("in")]    public int? In { get; init; }
    [JsonPropertyName("out")]   public int? Out { get; init; }
    [JsonPropertyName("bench")] public int? Bench { get; init; }
}

public sealed class ApiFootballShotsDto
{
    [JsonPropertyName("total")] public int? Total { get; init; }
    [JsonPropertyName("on")]    public int? On { get; init; }
}

public sealed class ApiFootballGoalsDto
{
    [JsonPropertyName("total")]    public int? Total { get; init; }
    [JsonPropertyName("conceded")] public int? Conceded { get; init; }
    [JsonPropertyName("assists")]  public int? Assists { get; init; }
    [JsonPropertyName("saves")]    public int? Saves { get; init; }
}

public sealed class ApiFootballPassesDto
{
    [JsonPropertyName("total")]    public int? Total { get; init; }
    [JsonPropertyName("key")]      public int? Key { get; init; }
    [JsonPropertyName("accuracy")] public int? Accuracy { get; init; }
}

public sealed class ApiFootballTacklesDto
{
    [JsonPropertyName("total")]         public int? Total { get; init; }
    [JsonPropertyName("blocks")]        public int? Blocks { get; init; }
    [JsonPropertyName("interceptions")] public int? Interceptions { get; init; }
}

public sealed class ApiFootballDuelsDto
{
    [JsonPropertyName("total")] public int? Total { get; init; }
    [JsonPropertyName("won")]   public int? Won { get; init; }
}

public sealed class ApiFootballDribblesDto
{
    [JsonPropertyName("attempts")] public int? Attempts { get; init; }
    [JsonPropertyName("success")]  public int? Success { get; init; }
}

public sealed class ApiFootballFoulsDto
{
    [JsonPropertyName("drawn")]     public int? Drawn { get; init; }
    [JsonPropertyName("committed")] public int? Committed { get; init; }
}

public sealed class ApiFootballCardsDto
{
    [JsonPropertyName("yellow")]    public int? Yellow { get; init; }
    [JsonPropertyName("yellowred")] public int? YellowRed { get; init; }
    [JsonPropertyName("red")]       public int? Red { get; init; }
}

public sealed class ApiFootballPenaltyDto
{
    [JsonPropertyName("scored")] public int? Scored { get; init; }
    [JsonPropertyName("missed")] public int? Missed { get; init; }
    // ⚠️ Typo en API — "commited" no "committed"
    [JsonPropertyName("commited")] public int? Committed { get; init; }
    [JsonPropertyName("saved")]    public int? Saved { get; init; }
    [JsonPropertyName("won")]      public int? Won { get; init; }
}

// Para el endpoint /players/seasons que devuelve List<int> directamente.
// Usamos un Envelope<int> tal cual.
