#!/bin/sh
# Render nginx.conf from its template so the server listens on the port that
# Aspire/ACA inject via $PORT (AppHost: ionic-app WithHttpEndpoint(env: "PORT")).
#
# nginx can't read env vars in its config, and the stock
# 20-envsubst-on-templates.sh only processes /etc/nginx/templates/*, not the
# main nginx.conf — so we render it here. If the container does not listen on
# the port ACA configures as the ingress targetPort, the StartUp probe fails
# (status code 1) and no traffic is routed.
#
# envsubst is restricted to '${PORT}' so nginx runtime vars ($uri, $host, ...)
# are left untouched. Defaults to 80 for a plain `docker run` without PORT.
set -e
: "${PORT:=80}"
export PORT
envsubst '${PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf
echo "[entrypoint] nginx listening on port ${PORT}"
