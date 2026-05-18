# backend-corba — Subsistema CORBA de noticias

Implementación Fase 1 del [SDD v0.2](../docs/SDD-CORBA-Noticias-v0.2.md).

- **Servidor CORBA Java 8** + Naming Service (`orbd`) en el mismo contenedor.
- **Adaptador REST** Spring Boot 2.7 (Java 8) que traduce HTTP ↔ IIOP.
- Persistencia **solo en memoria** con límite configurable y política **FIFO**.
- Respuestas REST envueltas uniformemente: `{ status, message, data }`.

## Estructura

```
backend-corba/
├── pom.xml              parent
├── idl-stubs/           News.idl + stubs/skeletons generados por idlj
├── server/              servant + orbd (puertos 1050 IIOP / 9000 naming)
├── adapter/             Spring Boot + Swagger UI (puerto 8080)
├── docker-compose.yml
├── postman/FootballManager-CORBA.postman_collection.json
└── README.md
```

## Arranque

```bash
cd backend-corba
docker compose up --build
```

| Servicio | Endpoint local |
|----------|----------------|
| Adapter REST | http://localhost:8080 |
| Swagger UI | http://localhost:8080/swagger-ui.html |
| Health | http://localhost:8080/actuator/health |
| IIOP del ORB | tcp://localhost:1050 |
| Naming Service (orbd) | tcp://localhost:9000 |

> **Despliegue en Azure (fase 4)**: el servidor CORBA **no** se expone públicamente. Irá con `ingress.external: false` en el mismo *Container Apps Environment* que el adapter. Sólo el adapter expone HTTPS al Gateway.

## Matriz de endpoints REST

| Método | Ruta | Descripción | Códigos |
|--------|------|-------------|---------|
| GET    | `/news` | Listar todas las noticias | 200, 503 |
| GET    | `/news/{id}` | Obtener noticia por id | 200, 404, 503 |
| POST   | `/news` | Publicar (admin) | 201, 400, 503 |
| DELETE | `/news/{id}` | Eliminar (admin) | 204, 404 |
| GET    | `/admin/status` | Estado del repositorio | 200 |
| POST   | `/admin/reset` | Vaciar todas las noticias | 204 |
| PUT    | `/admin/config/max-size` | Cambiar límite máximo | 200, 400 |

Formato de respuesta uniforme:

```json
{ "status": "success" | "error", "message": "...", "data": <T> | null }
```

## Postman

Importar `postman/FootballManager-CORBA.postman_collection.json` y ejecutar la colección entera (*Runner → Run*). Cubre los 9 pasos del SDD §7.2 incluyendo verificación automática del FIFO (límite=3, crear 4, comprobar que la 1ª desapareció).

## Build local (sin Docker)

Requiere JDK 8 y Maven 3.6+ en PATH:

```bash
mvn -f backend-corba/pom.xml clean install      # idl-stubs + server + adapter, todos los tests
mvn -f backend-corba/pom.xml verify             # añade JaCoCo (umbral 80%) + SpotBugs
```

JaCoCo HTML reports: `server/target/site/jacoco/index.html`, `adapter/target/site/jacoco/index.html`.

## Variables de entorno

### Servidor
| Variable | Default | Descripción |
|----------|---------|-------------|
| `NEWS_MAX_SIZE` | `50` | Límite máximo de noticias en memoria |
| `CORBA_PORT` | `1050` | Puerto IIOP |
| `NAMING_PORT` | `9000` | Puerto del Naming Service (orbd) |
| `NAMING_HOST` | `localhost` | Host del Naming Service (interno) |
| `CORBA_SERVER_HOST` | `corba-server` | Host **publicado en el IOR** — clave para Docker |

### Adaptador
| Variable | Default | Descripción |
|----------|---------|-------------|
| `CORBA_NAMING_HOST` | `corba-server` | Host del orbd |
| `CORBA_NAMING_PORT` | `9000` | Puerto del orbd |
| `CORBA_SERVANT_NAME` | `ServicioNoticias` | Nombre registrado en el Naming Service |
| `ADMIN_ENFORCE_AUTH` | `false` | **Fase 1: permisivo.** Poner `true` en fase 2 para exigir `X-User-Admin: true` en `/admin/**`. |

## Auth de admin (modo permisivo en fase 1)

`AdminAuthInterceptor` ya lee `X-User-Admin` en cada request a `/admin/**` y lo loguea. En fase 2, basta cambiar `ADMIN_ENFORCE_AUTH=true` para que bloquee con 403 sin tocar código.

## Regenerar stubs CORBA tras tocar `News.idl`

```bash
mvn -f backend-corba/pom.xml -pl idl-stubs clean install
```

`idlj-maven-plugin` regenera `target/generated-sources/idl/footballmanager/news/*.java` desde `idl-stubs/src/main/idl/News.idl`.

## Troubleshooting

### Puerto 1050, 9000 u 8080 ocupados
```bash
# Linux/macOS
lsof -i :1050
# Windows PowerShell
netstat -ano | findstr :1050
```
Cambiar el mapeo en `docker-compose.yml` si conviene (sólo el lado izquierdo del `1050:1050`).

### IOR publicado con `localhost` → el adapter no conecta
Síntoma: en los logs del server aparece `IOR:000000…` y el adapter da `COMM_FAILURE`. El IOR contiene `localhost` en vez de `corba-server`. Verificar que la variable `CORBA_SERVER_HOST=corba-server` está propagada (la inyecta `start.sh` como `-Dcom.sun.CORBA.ORBServerHost`).

### El adapter no encuentra el servidor (`Resolution failed`)
- Comprueba que ambos contenedores están en la red `corba-net` con `docker network inspect backend-corba_corba-net`.
- Resolución DNS interna: dentro del contenedor del adapter, `getent hosts corba-server` debe responder.
- Asegúrate de que `orbd` ya estaba escuchando antes de que arrancase el server (lo gestiona `start.sh` con `nc -z`).

### `orbd: command not found` al construir la imagen
La imagen base debe ser `eclipse-temurin:8-jdk` (no `8-jre`). El JRE no incluye `orbd` ni `idlj`.

### Cambios en `News.idl` no se reflejan
Build incremental no detecta el cambio si solo tocas el IDL. Forzar:
```bash
mvn -f backend-corba/pom.xml -pl idl-stubs clean install
```
y recompilar server y adapter.

### Tests del adapter fallan con `IllegalStateException: Failed to load ApplicationContext`
Los tests usan `@WebMvcTest`, sin contexto completo, y `ServicioNoticias` se inyecta con `@MockBean`. Si añades un nuevo bean que requiera `ORB`, decláralo `@ConditionalOnMissingBean` o muévelo fuera del `WebMvcTest` slice.

## Roadmap (resumen)

| Fase | Alcance | Estado |
|------|---------|--------|
| 1 | Server + Adapter en Docker, probado con Postman | ✅ esta entrega |
| 2 | Integración Aspire AppHost + ruta `/api/news/*` en Gateway YARP + UI | pendiente |
| 3 | Workflow GitHub Actions `ci-backend-corba.yml` (build + JaCoCo + SpotBugs + push GHCR) | pendiente |
| 4 | Despliegue ACA con ingress interno para el server | pendiente |
| 5 | Validación de Firebase token en adapter (`ADMIN_ENFORCE_AUTH=true`) | pendiente |
