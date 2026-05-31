# Despliegue y secretos — FootballManagerApp

Guía única para configurar **todos** los parámetros que necesita la app, en los
tres contextos en los que se ejecuta:

1. **Local con Aspire** (`dotnet run` del AppHost / F5) → *user-secrets* del AppHost.
2. **Local con azd** (`azd provision` / `azd deploy` desde tu máquina) → *azd env*.
3. **CI/CD** (workflow `deploy-azure.yml` en GitHub Actions) → *GitHub Variables/Secrets*.

> **Origen único de verdad.** Todos los parámetros se declaran **una vez** en
> `src/FootballManagerApp/FootballManagerApp.AppHost/AppHost.cs` con
> `builder.AddParameter(...)`. Aspire genera el Bicep a partir de ahí, y azd
> resuelve cada parámetro `Foo` desde la variable de entorno `AZURE_FOO`
> (SCREAMING_SNAKE con prefijo `AZURE_`).

---

## Matriz de parámetros

| Parámetro AppHost | ¿Secreto? | Default | Var azd / entorno | GitHub (`deploy-azure.yml`) | De dónde sale el valor |
|---|---|---|---|---|---|
| `postgres-user` | no | `postgres` | `AZURE_POSTGRES_USER` | Variable | fijo `postgres` |
| `postgres-password` | **sí** | `postgres` | `AZURE_POSTGRES_PASSWORD` | **Secret** | tú lo eliges (prod ≠ `postgres`) |
| `redis-password` | **sí** | `redis` | `AZURE_REDIS_PASSWORD` | **Secret** | tú lo eliges (prod ≠ `redis`) |
| `ApiFootballKey` | **sí** | — | `AZURE_API_FOOTBALL_KEY` | **Secret** | dashboard de API-Football |
| `GeminiApiKey` | **sí** | — | `AZURE_GEMINI_API_KEY` | **Secret** | Google AI Studio |
| `MongoDbUri` | **sí** | — | `AZURE_MONGO_DB_URI` | **Secret** | MongoDB Atlas (URI completa) |
| `FirebaseApiKey` | no¹ | — | `AZURE_FIREBASE_API_KEY` | Variable | Firebase Console → Web app config |
| `FirebaseAuthDomain` | no¹ | — | `AZURE_FIREBASE_AUTH_DOMAIN` | Variable | Firebase Console |
| `FirebaseProjectId` | no¹ | — | `AZURE_FIREBASE_PROJECT_ID` | Variable | Firebase Console |
| `FirebaseStorageBucket` | no¹ | — | `AZURE_FIREBASE_STORAGE_BUCKET` | Variable | Firebase Console |
| `FirebaseMessagingSenderId` | no¹ | — | `AZURE_FIREBASE_MESSAGING_SENDER_ID` | Variable | Firebase Console |
| `FirebaseAppId` | no¹ | — | `AZURE_FIREBASE_APP_ID` | Variable | Firebase Console |
| `FirebaseMeasurementId` | no¹ | — | `AZURE_FIREBASE_MEASUREMENT_ID` | Variable | Firebase Console |

¹ La config **web** de Firebase **no es secreta**: el `apiKey` es público por
diseño. La seguridad viene de *Authorized Domains* + *Security Rules* + la
validación del JWT en el Gateway. Por eso van como **GitHub Variables**, no
Secrets. (Lo distinto es el *Firebase Admin SDK* del backend Node —
`FIREBASE_PRIVATE_KEY` / `FIREBASE_CLIENT_EMAIL`— eso **sí** es secreto, pero
hoy lo valida el Gateway, no Node.)

> Los 7 `AZURE_FIREBASE_*` eran exactamente los **"7 required inputs missing"**
> que rompían `azd provision`. Ya están cableados en `deploy-azure.yml` a nivel
> de job; solo falta **crear las Variables en GitHub** (sección CI más abajo).

### Infra / autenticación azd (ya existentes, no son parámetros Aspire)

| Var | GitHub | Uso |
|---|---|---|
| `AZURE_CLIENT_ID` / `AZURE_TENANT_ID` / `AZURE_SUBSCRIPTION_ID` | Variable | login federado (OIDC) del Service Principal |
| `AZURE_LOCATION` | Variable | región (ej. `spaincentral`) |
| `AZURE_ENV_NAME` | (deriva de la rama) | `staging` en `develop`, `production` en `main` |

---

## 1) Local con Aspire (user-secrets del AppHost)

Para arrancar todo el sistema en local con `dotnet run` en el AppHost, los
parámetros se leen de configuración con la clave `Parameters:<Nombre>`. Lo
canónico es guardarlos en **user-secrets** (nunca se commitean).

```bash
cd src/FootballManagerApp/FootballManagerApp.AppHost

# Secretos reales
dotnet user-secrets set "Parameters:ApiFootballKey" "TU_API_FOOTBALL_KEY"
dotnet user-secrets set "Parameters:GeminiApiKey"   "TU_GEMINI_KEY"
dotnet user-secrets set "Parameters:MongoDbUri"     "mongodb+srv://...."
dotnet user-secrets set "Parameters:postgres-password" "postgres"   # local vale el default

# Config web de Firebase (no secreta, pero va por el mismo canal)
dotnet user-secrets set "Parameters:FirebaseApiKey"            "AIza..."
dotnet user-secrets set "Parameters:FirebaseAuthDomain"        "TU_PROJECT.firebaseapp.com"
dotnet user-secrets set "Parameters:FirebaseProjectId"         "TU_PROJECT"
dotnet user-secrets set "Parameters:FirebaseStorageBucket"     "TU_PROJECT.appspot.com"
dotnet user-secrets set "Parameters:FirebaseMessagingSenderId" "000000000000"
dotnet user-secrets set "Parameters:FirebaseAppId"             "1:000000000000:web:abc123"
dotnet user-secrets set "Parameters:FirebaseMeasurementId"     "G-XXXXXXXXXX"

# Verifica
dotnet user-secrets list
```

> `postgres-user` y `postgres-password` ya tienen default `postgres` en el
> AppHost, así que en local puedes omitirlos. El backend Node lee sus propias
> variables de `backend-node/.env` (ver `backend-node/.env.example`).

---

## 2) Local con azd (`azd provision` / `azd deploy` desde tu máquina)

Si despliegas a Azure **desde local** (no por CI), azd usa su propio *environment*
en `.azure/`. Cada parámetro se setea como `AZURE_<NOMBRE>`:

```bash
# Selecciona/crea el entorno
azd env select staging   # o: azd env new staging --location spaincentral --subscription <sub-id>

# Secretos
azd env set AZURE_API_FOOTBALL_KEY  "TU_API_FOOTBALL_KEY"
azd env set AZURE_GEMINI_API_KEY    "TU_GEMINI_KEY"
azd env set AZURE_MONGO_DB_URI      "mongodb+srv://...."
azd env set AZURE_POSTGRES_PASSWORD "UNA_PASSWORD_FUERTE"
azd env set AZURE_POSTGRES_USER     "postgres"
azd env set AZURE_REDIS_PASSWORD    "UNA_PASSWORD_FUERTE"

# Firebase (los 7 que faltaban)
azd env set AZURE_FIREBASE_API_KEY             "AIza..."
azd env set AZURE_FIREBASE_AUTH_DOMAIN         "TU_PROJECT.firebaseapp.com"
azd env set AZURE_FIREBASE_PROJECT_ID          "TU_PROJECT"
azd env set AZURE_FIREBASE_STORAGE_BUCKET      "TU_PROJECT.appspot.com"
azd env set AZURE_FIREBASE_MESSAGING_SENDER_ID "000000000000"
azd env set AZURE_FIREBASE_APP_ID              "1:000000000000:web:abc123"
azd env set AZURE_FIREBASE_MEASUREMENT_ID      "G-XXXXXXXXXX"

# Comprueba y provisiona
azd env get-values
azd provision --no-prompt
```

---

## 3) CI/CD — GitHub Actions (`deploy-azure.yml`)

El workflow ya referencia las 7 `vars.AZURE_FIREBASE_*` a nivel de job. Solo hay
que **crear las Variables y Secrets en GitHub**. Usa el `gh` CLI (autentícate
con `gh auth login` si no lo estás).

### 3a. Variables (Firebase + infra — públicas, no enmascaradas)

```bash
gh variable set AZURE_FIREBASE_API_KEY             --body "AIza..."
gh variable set AZURE_FIREBASE_AUTH_DOMAIN         --body "TU_PROJECT.firebaseapp.com"
gh variable set AZURE_FIREBASE_PROJECT_ID          --body "TU_PROJECT"
gh variable set AZURE_FIREBASE_STORAGE_BUCKET      --body "TU_PROJECT.appspot.com"
gh variable set AZURE_FIREBASE_MESSAGING_SENDER_ID --body "000000000000"
gh variable set AZURE_FIREBASE_APP_ID              --body "1:000000000000:web:abc123"
gh variable set AZURE_FIREBASE_MEASUREMENT_ID      --body "G-XXXXXXXXXX"

# Infra azd (si aún no existen)
gh variable set AZURE_POSTGRES_USER --body "postgres"
gh variable set AZURE_LOCATION      --body "spaincentral"
gh variable set AZURE_CLIENT_ID       --body "<app-registration-client-id>"
gh variable set AZURE_TENANT_ID       --body "<tenant-id>"
gh variable set AZURE_SUBSCRIPTION_ID --body "<subscription-id>"
```

### 3b. Secrets (los reales — enmascarados)

```bash
gh secret set AZURE_API_FOOTBALL_KEY  --body "TU_API_FOOTBALL_KEY"
gh secret set AZURE_GEMINI_API_KEY    --body "TU_GEMINI_KEY"
gh secret set AZURE_MONGO_DB_URI      --body "mongodb+srv://...."
gh secret set AZURE_POSTGRES_PASSWORD --body "UNA_PASSWORD_FUERTE"
gh secret set AZURE_REDIS_PASSWORD    --body "UNA_PASSWORD_FUERTE"
```

> **Variables vs Secrets por entorno.** El job corre con
> `environment: staging|production`. Las Variables/Secrets a nivel de **repo**
> aplican a ambos entornos (la config de Firebase es la misma). Si quieres
> valores distintos por entorno, créalos *scoped* al environment:
> `gh variable set NAME --env staging --body "..."` /
> `gh secret set NAME --env production --body "..."`.

### 3c. Verificar

```bash
gh variable list
gh secret list
```

Luego lanza el deploy:

```bash
# Manual con provision forzado (primera vez / cambió la infra)
gh workflow run "Deploy · Azure" -f target=all -f skip_provision=false

# O simplemente push a develop/main (auto-deploy por paths)
```

---

## Notas

- **`AZURE_REDIS_PASSWORD`** ahora **SÍ se usa**: el AppHost declara
  `AddParameter("redis-password", secret: true)` y se lo pasa a
  `AddRedis("redis", password: …)`, así el servidor Redis y todos los clientes
  (Players.API, Comments.API, backend-node) comparten **la misma** contraseña.
  Antes la password de `AddRedis` era **autogenerada** y derivaba entre
  revisiones de ACA → `NOAUTH` (.NET, sin password) / `WRONGPASS` (Node, password
  antigua). **Pon un valor real** en el Secret de GitHub (no lo dejes en
  `no-usado-actualmente`) y, tras cambiarlo, ejecuta **`azd provision` +
  `azd deploy`** (cambia la definición del recurso Redis, no basta `deploy`).
- **Regla de oro:** si añades un `AddParameter("Nuevo")` al AppHost, actualiza
  (1) esta matriz, (2) el bloque `env:` de `deploy-azure.yml` y (3) crea la
  Variable/Secret en GitHub. Si no, `azd provision` volverá a fallar con
  *"required inputs missing"*.
- El **frontend** materializa la config de Firebase en `src/assets/config.json`
  vía `scripts/write-config.js` (prestart), leyendo las `FIREBASE_*` que el
  AppHost le inyecta como variables de entorno del contenedor `ionic-app`.
