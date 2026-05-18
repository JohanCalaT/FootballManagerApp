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

// MongoDB Atlas — usado por backend-node (TRWM). El secret guarda la URI completa
// con credenciales (Atlas admin) y nombre de BD `football-manager`.
var mongoDbUri = builder.AddParameter("MongoDbUri", secret: true);

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

// Node consume el mismo Redis que .NET para compartir cache de API-Football
// (keys af:*). WithReference inyecta ConnectionStrings__redis con la cadena
// formato StackExchange.Redis — el cliente Node la parsea a host:port.
var nodeBackend = builder.AddNpmApp("node-backend", "../../../backend-node", scriptName: "dev")
    .WithHttpEndpoint(env: "PORT")
    .WithReference(redis)
    .WithEnvironment("MONGODB_URI",      mongoDbUri)
    .WithEnvironment("API_FOOTBALL_KEY", apiFootballKey)
    .WithEnvironment("GEMINI_API_KEY",   geminiApiKey)
    .WaitFor(redis)
    .WithExternalHttpEndpoints()
    .PublishAsDockerFile();

// Gateway routes /api/** dynamically to either dotnet (players/comments APIs)
// or node (this nodeBackend) depending on the active backend strategy. Wire
// the node-backend reference here so Aspire Service Discovery resolves the
// "node-backend" cluster in YARP config.
gateway.WithReference(nodeBackend);

// CORBA news subsystem (backend-corba/) — Java 8 servidor CORBA + adaptador
// Spring Boot 2.7. El servidor expone IIOP (1050) y Naming Service (9000); el
// adapter habla CORBA con el servidor y publica REST en 8080. El Gateway YARP
// solo conoce al adapter (HTTP). El toggle TRWM/DWSC NO aplica a noticias.
var corbaServer = builder
    .AddDockerfile("corba-server", "../../../backend-corba", "server/Dockerfile")
    .WithEndpoint(targetPort: 1050, port: 1050, scheme: "tcp", name: "iiop")
    .WithEndpoint(targetPort: 9000, port: 9000, scheme: "tcp", name: "naming")
    .WithEnvironment("NEWS_MAX_SIZE", "50")
    .WithEnvironment("CORBA_SERVER_HOST", "corba-server");

var newsAdapter = builder
    .AddDockerfile("news-adapter", "../../../backend-corba", "adapter/Dockerfile")
    .WithHttpEndpoint(targetPort: 8080, name: "http")
    .WithEnvironment("CORBA_NAMING_HOST", "corba-server")
    .WithEnvironment("CORBA_NAMING_PORT", "9000")
    .WithEnvironment("CORBA_SERVANT_NAME", "ServicioNoticias")
    .WithEnvironment("ADMIN_ENFORCE_AUTH", "false")
    .WaitFor(corbaServer);

gateway.WithReference(newsAdapter.GetEndpoint("http"));

var frontend = builder.AddNpmApp("ionic-app", "../../../frontend", scriptName: "start")
    .WithReference(gateway)
    .WithHttpEndpoint(targetPort: 80)
    .WithExternalHttpEndpoints()
    .WaitFor(gateway)
    .PublishAsDockerFile();

builder.Build().Run();
