namespace FootballManagerApp.Players.Application.Common.Interfaces;

public interface IBlobStorageService
{
    Task<string> UploadAsync(
        Stream imageStream,
        string fileName,
        string contentType,
        CancellationToken ct);

    Task DeleteAsync(string blobUrl, CancellationToken ct);
}
