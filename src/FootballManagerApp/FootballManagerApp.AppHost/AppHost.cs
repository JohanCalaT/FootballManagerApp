var builder = DistributedApplication.CreateBuilder(args);

// Expose the Aspire dashboard only outside Production so we can inspect
// traces/logs/metrics in staging without an extra Container App in prod
// (cost) and without leaking telemetry behind a public unauthenticated
// endpoint in the production environment.
var acaEnv = builder.AddAzureContainerAppEnvironment("aca-env");
var isProduction = string.Equals(
    builder.Environment.EnvironmentName,
    "Production",
    StringComparison.OrdinalIgnoreCase);
acaEnv.WithDashboard(!isProduction);

// Stable Postgres credentials for both local Docker and Azure publish.
// In Azure they are read from the AZURE_POSTGRES_USER / AZURE_POSTGRES_PASSWORD
// pipeline secrets (deploy-azure.yml) and bound to the Flexible Server via
// WithPasswordAuthentication — otherwise Aspire defaults to Entra-only auth
// and the injected connection string ships without a password, failing the
// SCRAM-SHA-256 handshake.
var postgresUser = builder.AddParameter("postgres-user", "postgres");
var postgresPassword = builder.AddParameter("postgres-password", "postgres", secret: true);

// Postgres: local = Docker container with fixed port + persistent volume + fixed creds,
// cloud = Azure Database for PostgreSQL Flexible Server with password auth.
var postgres = builder.AddAzurePostgresFlexibleServer("postgres")
    .WithPasswordAuthentication(postgresUser, postgresPassword)
    .RunAsContainer(c => c
        .WithDataVolume()
        .WithHostPort(5432)
        .WithUserName(postgresUser)
        .WithPassword(postgresPassword));

var playersDb = postgres.AddDatabase("playersdb");
var commentsDb = postgres.AddDatabase("commentsdb");

// Redis: siempre como contenedor (local y en Azure). Cambiado desde
// AddAzureManagedRedis porque éste mapea a Microsoft.Cache/redisEnterprise,
// que exige availability zones registradas en la suscripción — no las hay
// en Azure for Students. AddRedis levanta el contenedor `redis:*` con
// volumen persistente en local y como Container App en Azure, sin coste
// de Azure Cache for Redis managed. Cache-aside lo usan Players.API,
// Comments.API y backend-node vía el mismo Redis.
// La contraseña se FIJA como parámetro (no autogenerada) para que el servidor
// Redis y TODOS los clientes (Players.API, Comments.API, backend-node)
// compartan SIEMPRE el mismo valor. La password autogenerada de AddRedis
// derivaba entre revisiones de ACA: el contenedor Redis arrancaba con una
// nueva mientras revisiones viejas de las APIs conservaban una cadena
// ConnectionStrings__redis desfasada → NOAUTH (.NET, sin password) y WRONGPASS
// (Node, password antigua). En local vale el default 'redis'; en Azure se lee
// de AZURE_REDIS_PASSWORD (cableado en deploy-azure.yml).
var redisPassword = builder.AddParameter("redis-password", "redis", secret: true);

var redis = builder.AddRedis("redis", password: redisPassword)
    .WithDataVolume()
    .WithHostPort(6379);

// External API secrets — user-secrets del AppHost en local, Key Vault en cloud.
var apiFootballKey = builder.AddParameter("ApiFootballKey", secret: true);
var geminiApiKey   = builder.AddParameter("GeminiApiKey",   secret: true);

// MongoDB Atlas — usado por backend-node (TRWM). El secret guarda la URI completa
// con credenciales (Atlas admin) y nombre de BD `football-manager`.
var mongoDbUri = builder.AddParameter("MongoDbUri", secret: true);

// Firebase web app config — NO son secretos reales (el apiKey de Firebase es
// público por diseño: la seguridad viene de Authorized Domains + Security Rules
// + validación del JWT en el Gateway). Los pasamos por AppHost igual que el
// resto para tener una sola fuente de verdad entre local (user-secrets) y
// cloud (Key Vault). projectId además lo consume el Gateway para validar JWTs.
var firebaseApiKey            = builder.AddParameter("FirebaseApiKey");
var firebaseAuthDomain        = builder.AddParameter("FirebaseAuthDomain");
var firebaseProjectId         = builder.AddParameter("FirebaseProjectId");
var firebaseStorageBucket     = builder.AddParameter("FirebaseStorageBucket");
var firebaseMessagingSenderId = builder.AddParameter("FirebaseMessagingSenderId");
var firebaseAppId             = builder.AddParameter("FirebaseAppId");
var firebaseMeasurementId     = builder.AddParameter("FirebaseMeasurementId");

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
    .WithEnvironment("Firebase__ProjectId", firebaseProjectId)
    .WithExternalHttpEndpoints();

// Node consume el mismo Redis que .NET para compartir cache de API-Football
// (keys af:*). WithReference inyecta ConnectionStrings__redis con la cadena
// formato StackExchange.Redis — el cliente Node la parsea a host:port.
// node-backend stays INTERNAL — its public surface (REST API, Swagger UI at
// /docs/node, Pug status panel at /status) is exposed through the YARP
// Gateway. Marking it external too would create a parallel public origin
// outside the gateway-validated path.
var nodeBackend = builder.AddNpmApp("node-backend", "../../../backend-node", scriptName: "dev")
    .WithHttpEndpoint(env: "PORT")
    .WithReference(redis)
    .WithEnvironment("MONGODB_URI",      mongoDbUri)
    .WithEnvironment("API_FOOTBALL_KEY", apiFootballKey)
    .WithEnvironment("GEMINI_API_KEY",   geminiApiKey)
    .WaitFor(redis)
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

// CORBA objects are transient and orbd keeps the naming state in memory, so the
// server can't scale out or be restarted freely without invalidating the
// references the adapter holds. Pin it to exactly one always-on replica (no
// scale-to-zero): otherwise an idle scale-down kills the servant and the adapter
// would have to re-resolve on the next call (it now can, but keeping it warm
// avoids cold starts and OBJECT_NOT_EXIST windows).
corbaServer.PublishAsAzureContainerApp((_, app) =>
{
    app.Template.Scale.MinReplicas = 1;
    app.Template.Scale.MaxReplicas = 1;
});

var newsAdapter = builder
    .AddDockerfile("news-adapter", "../../../backend-corba", "adapter/Dockerfile")
    .WithHttpEndpoint(targetPort: 8080, name: "http")
    .WithEnvironment("CORBA_NAMING_HOST", "corba-server")
    .WithEnvironment("CORBA_NAMING_PORT", "9000")
    .WithEnvironment("CORBA_SERVANT_NAME", "ServicioNoticias")
    .WithEnvironment("ADMIN_ENFORCE_AUTH", "false")
    .WaitFor(corbaServer);

// Keep the adapter warm too (min 1): it caches the CORBA reference and a
// scale-to-zero cold start would just add latency + a re-resolve on first call.
newsAdapter.PublishAsAzureContainerApp((_, app) =>
{
    app.Template.Scale.MinReplicas = 1;
});

gateway.WithReference(newsAdapter.GetEndpoint("http"));

// AddNpmApp: Aspire allocates a random host port, exposes it as the PORT
// env var, and the npm `start` script forwards it to `ionic serve --port`.
// Both the Aspire dashboard URL and the actual dev server end up on the
// same port, so opening the dashboard link reaches the running app.
var frontend = builder.AddNpmApp("ionic-app", "../../../frontend", scriptName: "start")
    .WithReference(gateway)
    .WithHttpEndpoint(env: "PORT")
    // Firebase web config — leído por scripts/write-config.js (prestart) y
    // materializado en src/assets/config.json antes de arrancar Ionic.
    .WithEnvironment("FIREBASE_API_KEY",             firebaseApiKey)
    .WithEnvironment("FIREBASE_AUTH_DOMAIN",         firebaseAuthDomain)
    .WithEnvironment("FIREBASE_PROJECT_ID",          firebaseProjectId)
    .WithEnvironment("FIREBASE_STORAGE_BUCKET",      firebaseStorageBucket)
    .WithEnvironment("FIREBASE_MESSAGING_SENDER_ID", firebaseMessagingSenderId)
    .WithEnvironment("FIREBASE_APP_ID",              firebaseAppId)
    .WithEnvironment("FIREBASE_MEASUREMENT_ID",      firebaseMeasurementId)
    .WithExternalHttpEndpoints()
    .WaitFor(gateway)
    .PublishAsDockerFile();

builder.Build().Run();
