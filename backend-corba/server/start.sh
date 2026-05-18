#!/bin/sh
set -eu

NAMING_PORT="${NAMING_PORT:-9000}"
CORBA_PORT="${CORBA_PORT:-1050}"

echo "[start.sh] Arrancando orbd (Naming Service) en puerto ${NAMING_PORT}..."
orbd -ORBInitialPort "${NAMING_PORT}" -ORBInitialHost 0.0.0.0 &
ORBD_PID=$!

# Espera a que orbd este escuchando.
i=0
while ! nc -z 127.0.0.1 "${NAMING_PORT}" 2>/dev/null; do
  i=$((i+1))
  if [ "${i}" -ge 30 ]; then
    echo "[start.sh] ERROR: orbd no escucho en ${NAMING_PORT} tras 30s." >&2
    kill "${ORBD_PID}" 2>/dev/null || true
    exit 1
  fi
  sleep 1
done

echo "[start.sh] orbd OK. Lanzando ServidorNoticias (CORBA_PORT=${CORBA_PORT})..."
exec java -jar /app/server.jar
