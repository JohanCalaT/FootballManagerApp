#!/bin/sh
# Render nginx.conf from its template before nginx starts. nginx can't read env
# vars in its config, and the stock 20-envsubst-on-templates.sh only processes
# /etc/nginx/templates/*, not the main nginx.conf — so we render it here.
#
# Two values are injected:
#
#   $PORT        — the ingress targetPort Aspire/ACA allocate (AppHost:
#                  ionic-app WithHttpEndpoint(env: "PORT")). If the container
#                  doesn't listen on it, the StartUp probe fails (status 1).
#
#   $GATEWAY_URL — the YARP Gateway URL. The SPA uses RELATIVE paths (/api,
#                  /config), so nginx must reverse-proxy them to the Gateway,
#                  same-origin, exactly like the dev proxy.conf.js. Aspire
#                  injects the gateway address into this container via
#                  WithReference(gateway) as services__gateway__{https,http}__0
#                  (prefer https, like the dev proxy). Without this the browser
#                  hits nginx itself: GET falls through to index.html, POST
#                  /config/backend returns 405 Not Allowed.
#
# envsubst is restricted to '${PORT} ${GATEWAY_URL}' so nginx runtime vars
# ($uri, $host, $scheme, ...) are left untouched.
set -e

: "${PORT:=80}"
export PORT

GATEWAY_URL="$(printenv services__gateway__https__0 2>/dev/null || true)"
[ -z "$GATEWAY_URL" ] && GATEWAY_URL="$(printenv services__gateway__http__0 2>/dev/null || true)"
[ -z "$GATEWAY_URL" ] && GATEWAY_URL="http://localhost:5000"
# Strip any trailing slash: with `location /api/`, a proxy_pass that carries a
# path (even just "/") would rewrite the URI and strip the /api prefix YARP
# needs. A bare scheme://host passes the original URI through untouched.
GATEWAY_URL="${GATEWAY_URL%/}"
export GATEWAY_URL

envsubst '${PORT} ${GATEWAY_URL}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf
echo "[entrypoint] nginx listening on ${PORT}, proxying /api + /config to ${GATEWAY_URL}"
