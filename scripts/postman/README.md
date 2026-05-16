# FootballManagerApp — Colección de pruebas

`FootballManagerApp.postman_collection.json` es una colección Postman v2.1 que
ejercita el CRUD completo de Players y Comments con todas las validaciones
hardened: HATEOAS, ETag/If-Match, soft-delete, idempotencia, rate-limit, 409
por nombre+equipo y rating decimal.

Repartidos en **9 carpetas**, todos con asserts automáticos
(`pm.test`). Pulsando "Run collection" en Postman se ejecutan en orden y los
IDs / versions se guardan en variables.

## Cómo correrla

1. Levanta la AppHost:
   ```powershell
   dotnet run --project src/FootballManagerApp/FootballManagerApp.AppHost
   ```
2. Abre el **dashboard de Aspire** que aparece en consola.
3. Copia la **URL** de `players-api` y de `comments-api`.
4. En Postman (o Scalar):
   - **Import** → seleccionar `FootballManagerApp.postman_collection.json`.
5. Edita la colección → **Variables** → pega tus URLs en `playersUrl` y `commentsUrl`.
6. **Run collection**.

Si Postman da `Session closed with error code 1`:
- Postman → Settings → General → **Use HTTP/2: OFF** (forzar HTTP/1.1).
- `dotnet dev-certs https --trust` una vez.

## Orden de ejecución

| # | Grupo                          | Qué prueba                                              |
|---|--------------------------------|----------------------------------------------------------|
| 0 | Health                         | Players + Comments responden 200                         |
| 1 | Crear jugadores                | 3 POST (Pedri, Vinícius, Bellingham). Guarda IDs+Version |
| 2 | Validaciones (400/409/401)     | Falta de auth, Name corto, BirthDate inválida, Stats dup, duplicado Name+Team |
| 3 | Lecturas (HATEOAS + ETag)      | Listado paginado, búsqueda, wildcards literal, GET con ETag |
| 4 | Comentarios (decimal + rates)  | Rating 5, 4.5 (media estrella), 3.3 inválido, lectura embebida |
| 5 | Rate limit (429)               | 6 POST seguidos del mismo usuario → el 6º cae con 429    |
| 6 | Mutaciones admin               | 403 sin admin, 412 If-Match incorrecto, 200 If-Match OK, DELETE idempotente, soft-delete oculta vía GET 404 |
| 7 | Fase 2B (501)                  | /import y /ideal-team siguen devolviendo 501             |
| 8 | Node backend (TRWM)            | CRUD Mongo, soft-uniqueness, comments anidados, /status  |
| 9 | Gateway YARP (toggle)          | Strategy/Factory dotnet↔node, always-dotnet endpoints, header forwarding |

## Variables que se rellenan solas

| Variable        | Origen                            | Uso posterior                          |
|-----------------|-----------------------------------|----------------------------------------|
| `pedriId`       | POST Pedri                        | GETs, PUT, comments                    |
| `pedriVersion`  | POST Pedri + GET Pedri            | Header `If-Match: "{{pedriVersion}}"`  |
| `viniciusId`    | POST Vinícius                     | Comments + flood test                  |
| `bellinghamId`  | POST Bellingham                   | DELETE idempotente + soft-delete 404   |
| `commentId`     | POST 1er comentario               | DELETE comment                         |

## Detalles importantes

- **ETag / If-Match**: en GET y PUT exitosos el server devuelve `ETag: "n"` con
  la versión actual del jugador. El test "PUT con If-Match correcto" usa el
  valor guardado en `{{pedriVersion}}`. Si falla con 412, ejecuta primero el
  GET de Pedri (carpeta 3) que refresca la variable.
- **Soft-delete**: después del DELETE, GET devuelve 404. Para verificar la fila
  física soft-deleted habría que ir al admin endpoint (no expuesto aún) o
  consultar la BD directamente.
- **Rate limit**: si ya superaste el flood antes y la ventana de 60s no ha
  expirado, los Flood #1-#5 también devolverán 429. Espera 1 minuto o cambia
  el header `X-User-Id` a otro valor en esos requests.
- **Circuit Breaker**: si `Comments.API` cae, GET Pedri por id sigue
  respondiendo 200 con `comments: []` (degradación graceful por Polly).
- **Headers de auth**: `X-User-Id` y `X-User-Admin` son temporales hasta que
  el Gateway valide JWT de Firebase en Fase 2B.
