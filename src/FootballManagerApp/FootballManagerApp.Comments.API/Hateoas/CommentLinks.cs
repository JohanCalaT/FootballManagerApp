using FootballManagerApp.Shared.Responses;
using Microsoft.AspNetCore.Mvc;

namespace FootballManagerApp.Comments.API.Hateoas;

internal static class CommentLinks
{
    public static Dictionary<string, HateoasLink> ForList(IUrlHelper url, Guid playerId) =>
        new()
        {
            ["self"]   = new(url.Link("GetCommentsByPlayer", new { playerId })!, "self", "GET"),
            ["create"] = new(url.Link("CreateCommentForPlayer", new { playerId })!, "create", "POST"),
        };

    public static Dictionary<string, HateoasLink> ForDetail(
        IUrlHelper url, Guid playerId, Guid commentId, bool isAdmin)
    {
        var links = new Dictionary<string, HateoasLink>
        {
            ["collection"] = new(url.Link("GetCommentsByPlayer", new { playerId })!, "collection", "GET"),
        };
        if (isAdmin)
            links["delete"] = new(url.Link("DeleteComment", new { id = commentId })!, "delete", "DELETE");
        return links;
    }
}
