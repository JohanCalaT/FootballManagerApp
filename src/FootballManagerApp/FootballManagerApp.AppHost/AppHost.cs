var builder = DistributedApplication.CreateBuilder(args);

builder.AddAzureContainerAppEnvironment("aca-env").WithDashboard(false);

// Local-only stable credentials so external DB clients can connect with fixed creds.
// In Azure publish these parameters are not used by the managed Postgres Flexible Server
// (which defaults to Microsoft Entra ID authentication).
var postgresUser = builder.AddParameter("postgres-user", "postgres");
var postgresPassword = builder.AddParameter("postgres-password", "postgres", secret: true);

// Postgres: local = Docker container with fixed port + persistent volume + fixed creds,
// cloud = Azure Database for PostgreSQL Flexible Server (managed, Entra auth).
var postgres = builder.AddAzurePostgresFlexibleServer("postgres")
    .RunAsContainer(c => c
        .WithDataVolume()
        .WithHostPort(5432)
        .WithUserName(postgresUser)
        .WithPassword(postgresPassword));

var playersDb = postgres.AddDatabase("playersdb");
var commentsDb = postgres.AddDatabase("commentsdb");

// Redis: local = Docker container fixed port + persistent volume,
// cloud = Azure Managed Redis. Cache-aside lo usan Players.API y Comments.API.
var redis = builder.AddAzureManagedRedis("redis")
    .RunAsContainer(c => c
        .WithDataVolume()
        .WithHostPort(6379));

// External API secrets — user-secrets del AppHost en local, Key Vault en cloud.
var apiFootballKey = builder.AddParameter("ApiFootballKey", secret: true);
var geminiApiKey   = builder.AddParameter("GeminiApiKey",   secret: true);

// Migration workers — run once per deploy, exit, gate the APIs via WaitForCompletion.
var playersMigrations = builder
    .AddProject<Projects.FootballManagerApp_Players_MigrationService>("players-migrations")
    .WithReference(playersDb)
    .WaitFor(playersDb);

var commentsMigrations = builder
    .AddProject<Projects.FootballManagerApp_Comments_MigrationService>("comments-migrations")
    .WithReference(commentsDb)
    .WaitFor(commentsDb);

var commentsApi = builder.AddProject<Projects.FootballManagerApp_Comments_API>("comments-api")
    .WithReference(commentsDb)
    .WithReference(redis)
    .WaitForCompletion(commentsMigrations)
    .WaitFor(redis);

var playersApi = builder.AddProject<Projects.FootballManagerApp_Players_API>("players-api")
    .WithReference(playersDb)
    .WithReference(redis)
    .WithReference(commentsApi)
    .WithEnvironment("ApiFootball__ApiKey", apiFootballKey)
    .WithEnvironment("Gemini__ApiKey",     geminiApiKey)
    .WaitForCompletion(playersMigrations)
    .WaitFor(redis);

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
    .WithHttpEndpoint(targetPort: 80)
    .WithExternalHttpEndpoints()
    .WaitFor(gateway)
    .PublishAsDockerFile();

builder.Build().Run();
