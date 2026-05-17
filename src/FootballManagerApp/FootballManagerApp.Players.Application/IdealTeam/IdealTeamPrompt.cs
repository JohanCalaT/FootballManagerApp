using System.Globalization;
using System.Text;
using FootballManagerApp.Players.Application.IdealTeam.DTOs;

namespace FootballManagerApp.Players.Application.IdealTeam;

/// <summary>
/// Construye el prompt enviado a Gemini para generar el equipo ideal.
/// El texto del prompt es bit-a-bit idéntico al equivalente en Node
/// (backend-node/src/services/idealTeamPrompt.ts) — cambios aquí deben
/// replicarse allí.
/// </summary>
public static class IdealTeamPrompt
{
    public static string Build(
        string formation,
        IEnumerable<PlayerForPromptDto> goalkeepers,
        IEnumerable<PlayerForPromptDto> defenders,
        IEnumerable<PlayerForPromptDto> midfielders,
        IEnumerable<PlayerForPromptDto> attackers)
    {
        var sb = new StringBuilder(4096);

        sb.AppendLine("Eres un experto táctico en fútbol con conocimiento");
        sb.AppendLine("profundo de todas las formaciones modernas.");
        sb.AppendLine();
        sb.AppendLine("Tu tarea es seleccionar el mejor equipo posible");
        sb.Append("en la formación ").Append(formation)
          .AppendLine(" usando ÚNICAMENTE");
        sb.AppendLine("los jugadores de la lista proporcionada.");
        sb.AppendLine();
        sb.AppendLine("FORMACIONES QUE CONOCES Y SABES INTERPRETAR:");
        sb.AppendLine("4-4-2, 4-5-1, 4-3-3, 4-3-2-1, 4-1-3-2,");
        sb.AppendLine("5-4-1, 4-1-2-1-2, 3-5-2, 5-3-2, 4-2-3-1,");
        sb.AppendLine("3-4-3, 3-2-4-1, WM (3-2-5), 2-3-2-3, 4-2-4");
        sb.AppendLine();

        sb.AppendLine("JUGADORES DISPONIBLES:");
        sb.AppendLine();

        sb.AppendLine("PORTEROS:");
        AppendList(sb, goalkeepers, FormatGoalkeeper);
        sb.AppendLine("Formato: id | nombre | equipo | rating | paradas | goles_encajados");
        sb.AppendLine();

        sb.AppendLine("DEFENSAS:");
        AppendList(sb, defenders, FormatDefender);
        sb.AppendLine("Formato: id | nombre | equipo | rating | entradas | duelos_ganados");
        sb.AppendLine();

        sb.AppendLine("CENTROCAMPISTAS:");
        AppendList(sb, midfielders, FormatMidfielder);
        sb.AppendLine("Formato: id | nombre | equipo | rating | asistencias | pases_clave");
        sb.AppendLine();

        sb.AppendLine("DELANTEROS:");
        AppendList(sb, attackers, FormatAttacker);
        sb.AppendLine("Formato: id | nombre | equipo | rating | goles | asistencias");
        sb.AppendLine();

        sb.AppendLine("REGLAS:");
        sb.AppendLine("1. Usa SOLO jugadores de la lista");
        sb.AppendLine("2. No repitas jugadores");
        sb.AppendLine("3. Adapta roles según la formación");
        sb.AppendLine("   (ej: en 3-5-2 los carrileros pueden ser");
        sb.AppendLine("   defensas o medios según sus stats)");
        sb.AppendLine("4. Prioriza mayor rating_promedio");
        sb.AppendLine("5. Si no hay suficientes en una posición,");
        sb.AppendLine("   adapta jugadores de posición similar");
        sb.AppendLine("6. El id debe ser exactamente el de la lista");
        sb.AppendLine();

        sb.AppendLine("COORDENADAS:");
        sb.AppendLine("Campo de 0.0 a 1.0 en ambos ejes.");
        sb.AppendLine("x: horizontal (0=izq, 1=der, 0.5=centro)");
        sb.AppendLine("y: vertical (0=portería propia, 1=portería rival)");
        sb.AppendLine();
        sb.AppendLine("Referencias:");
        sb.AppendLine("  Portero:    x=0.5,  y=0.05");
        sb.AppendLine("  Defensas:   y entre 0.15 y 0.30");
        sb.AppendLine("  Medios:     y entre 0.40 y 0.60");
        sb.AppendLine("  Delanteros: y entre 0.70 y 0.90");
        sb.AppendLine();
        sb.AppendLine("Distribuye uniformemente en x:");
        sb.AppendLine("  4 jugadores: x = 0.2, 0.4, 0.6, 0.8");
        sb.AppendLine("  3 jugadores: x = 0.25, 0.5, 0.75");
        sb.AppendLine("  2 jugadores: x = 0.3, 0.7");
        sb.AppendLine("  1 jugador:   x = 0.5");
        sb.AppendLine();

        sb.AppendLine("Responde ÚNICAMENTE con este JSON sin texto");
        sb.AppendLine("adicional, sin markdown, sin explicaciones:");
        sb.AppendLine();
        sb.AppendLine("{");
        sb.Append("  \"formation\": \"").Append(formation).AppendLine("\",");
        sb.AppendLine("  \"goalkeeper\": {");
        sb.AppendLine("    \"id\": \"uuid exacto de la lista\",");
        sb.AppendLine("    \"name\": \"nombre\",");
        sb.AppendLine("    \"team\": \"equipo\",");
        sb.AppendLine("    \"position\": \"GK\",");
        sb.AppendLine("    \"x\": 0.5,");
        sb.AppendLine("    \"y\": 0.05,");
        sb.AppendLine("    \"reason\": \"justificación\"");
        sb.AppendLine("  },");
        sb.AppendLine("  \"defenders\":   [ /* mismo shape, position ∈ {CB,LB,RB,LWB,RWB} */ ],");
        sb.AppendLine("  \"midfielders\": [ /* mismo shape, position ∈ {CDM,CM,CAM,LM,RM}  */ ],");
        sb.AppendLine("  \"attackers\":   [ /* mismo shape, position ∈ {LW,RW,CF,ST}        */ ],");
        sb.AppendLine("  \"generalJustification\": \"análisis táctico\"");
        sb.AppendLine("}");

        return sb.ToString();
    }

    private static void AppendList(
        StringBuilder sb,
        IEnumerable<PlayerForPromptDto> players,
        Func<PlayerForPromptDto, string> formatter)
    {
        var any = false;
        foreach (var p in players)
        {
            sb.AppendLine(formatter(p));
            any = true;
        }
        if (!any) sb.AppendLine("(ninguno)");
    }

    private static string Rating(decimal? r) =>
        r.HasValue
            ? r.Value.ToString("0.00", CultureInfo.InvariantCulture)
            : "N/A";

    private static string FormatGoalkeeper(PlayerForPromptDto p) =>
        $"{p.Id} | {p.Name} | {p.Team} | rating:{Rating(p.AverageRating)} | " +
        $"paradas:{p.TotalSaves} | apariciones:{p.TotalAppearances}";

    private static string FormatDefender(PlayerForPromptDto p) =>
        $"{p.Id} | {p.Name} | {p.Team} | rating:{Rating(p.AverageRating)} | " +
        $"entradas:{p.TotalTackles} | apariciones:{p.TotalAppearances}";

    private static string FormatMidfielder(PlayerForPromptDto p) =>
        $"{p.Id} | {p.Name} | {p.Team} | rating:{Rating(p.AverageRating)} | " +
        $"asis:{p.TotalAssists} | apariciones:{p.TotalAppearances}";

    private static string FormatAttacker(PlayerForPromptDto p) =>
        $"{p.Id} | {p.Name} | {p.Team} | rating:{Rating(p.AverageRating)} | " +
        $"goles:{p.TotalGoals} | asis:{p.TotalAssists}";
}
