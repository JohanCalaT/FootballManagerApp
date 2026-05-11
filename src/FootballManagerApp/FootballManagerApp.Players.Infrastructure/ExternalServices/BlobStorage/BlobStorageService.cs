using FootballManagerApp.Players.Application.Common.Interfaces;
using Microsoft.Extensions.Configuration;

namespace FootballManagerApp.Players.Infrastructure.ExternalServices.BlobStorage;

public class BlobStorageService : IBlobStorageService
{
    private readonly IConfiguration _config;

    public BlobStorageService(IConfiguration config) => _config = config;

    public Task<string> UploadAsync(
        Stream imageStream,
        string fileName,
        string contentType,
        CancellationToken ct) =>
        throw new NotImplementedException("TODO Fase 2");

    public Task DeleteAsync(string blobUrl, CancellationToken ct) =>
        throw new NotImplementedException("TODO Fase 2");
}
