# syntax=docker/dockerfile:1
# Build context: backend-corba/   (configurado en docker-compose.yml)

FROM maven:3.9-eclipse-temurin-8 AS build
WORKDIR /build
COPY pom.xml .
COPY idl-stubs ./idl-stubs
COPY server ./server
COPY adapter ./adapter
RUN mvn -pl idl-stubs,server -am package -DskipTests -B

FROM eclipse-temurin:8-jdk
RUN apt-get update \
 && apt-get install -y --no-install-recommends netcat-openbsd \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /build/server/target/server.jar /app/server.jar
COPY server/start.sh /app/start.sh
RUN chmod +x /app/start.sh
EXPOSE 1050 9000
CMD ["/app/start.sh"]
