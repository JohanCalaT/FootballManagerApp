using FootballManagerApp.Shared.Responses;
using Microsoft.AspNetCore.Mvc;

namespace FootballManagerApp.Players.API.Hateoas;

internal static class PlayerLinks
{
    public static Dictionary<string, HateoasLink> ForDetail(
        IUrlHelper url, Guid id, string? commentsBase, bool isAdmin)
    {
        var links = new Dictionary<string, HateoasLink>
        {
            ["self"]       = new(url.Link("GetPlayerById", new { id })!, "self", "GET"),
            ["collection"] = new(url.Link("GetAllPlayers", null)!, "collection", "GET"),
        };

        if (!string.IsNullOrEmpty(commentsBase))
            links["comments"] = new($"{commentsBase}/api/comments/player/{id}", "comments", "GET");

        if (isAdmin)
        {
            links["update"] = new(url.Link("UpdatePlayer", new { id })!, "update", "PUT");
            links["delete"] = new(url.Link("DeletePlayer", new { id })!, "delete", "DELETE");
        }
        return links;
    }

    public static Dictionary<string, HateoasLink> ForList(
        IUrlHelper url, int page, int limit, int total)
    {
        var pages = limit <= 0 ? 1 : (int)Math.Ceiling((double)total / limit);
        pages = Math.Max(pages, 1);

        var links = new Dictionary<string, HateoasLink>
        {
            ["self"]  = new(url.Link("GetAllPlayers",
                new { page, limit })!, "self", "GET"),
            ["first"] = new(url.Link("GetAllPlayers",
                new { page = 1, limit })!, "first", "GET"),
            ["last"]  = new(url.Link("GetAllPlayers",
                new { page = pages, limit })!, "last", "GET"),
        };

        if (page > 1)
            links["prev"] = new(url.Link("GetAllPlayers",
                new { page = page - 1, limit })!, "prev", "GET");
        if (page < pages)
            links["next"] = new(url.Link("GetAllPlayers",
                new { page = page + 1, limit })!, "next", "GET");

        return links;
    }
}
