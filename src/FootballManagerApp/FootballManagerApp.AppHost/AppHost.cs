var builder = DistributedApplication.CreateBuilder(args);

var gateway = builder.AddProject<Projects.FootballManagerApp_Gateway>("gateway")
    .WithExternalHttpEndpoints();

var playersApi = builder.AddProject<Projects.FootballManagerApp_Players_API>("players-api");

var commentsApi = builder.AddProject<Projects.FootballManagerApp_Comments_API>("comments-api");

var nodeBackend = builder.AddNpmApp("node-backend", "../../../backend-node", scriptName: "dev")
    .WithHttpEndpoint(env: "PORT")
    .WithExternalHttpEndpoints();

var frontend = builder.AddNpmApp("ionic-app", "../../../frontend", scriptName: "start")
    .WithReference(gateway)
    .WithHttpEndpoint(env: "PORT")
    .WithExternalHttpEndpoints()
    .WaitFor(gateway);

builder.Build().Run();
