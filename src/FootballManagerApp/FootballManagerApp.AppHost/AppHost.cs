var builder = DistributedApplication.CreateBuilder(args);

builder.AddAzureContainerAppEnvironment("aca-env").WithDashboard(false);

var playersApi = builder.AddProject<Projects.FootballManagerApp_Players_API>("players-api");

var commentsApi = builder.AddProject<Projects.FootballManagerApp_Comments_API>("comments-api");

var gateway = builder.AddProject<Projects.FootballManagerApp_Gateway>("gateway")
    .WithReference(playersApi)
    .WithReference(commentsApi)
    .WithExternalHttpEndpoints();

var nodeBackend = builder.AddNpmApp("node-backend", "../../../backend-node", scriptName: "dev")
    .WithHttpEndpoint(env: "PORT")
    .WithExternalHttpEndpoints()
    .PublishAsDockerFile();

var frontend = builder.AddNpmApp("ionic-app", "../../../frontend", scriptName: "start")
    .WithReference(gateway)
    .WithHttpEndpoint(env: "PORT")
    .WithExternalHttpEndpoints()
    .WaitFor(gateway)
    .PublishAsDockerFile();

builder.Build().Run();
