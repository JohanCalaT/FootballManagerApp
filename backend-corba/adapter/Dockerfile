# syntax=docker/dockerfile:1
# Build context: backend-corba/   (configurado en docker-compose.yml)

FROM maven:3.9-eclipse-temurin-8 AS build
WORKDIR /build
COPY pom.xml .
COPY idl-stubs ./idl-stubs
COPY server ./server
COPY adapter ./adapter
RUN mvn -pl idl-stubs,adapter -am package -DskipTests -B

FROM eclipse-temurin:8-jdk
WORKDIR /app
COPY --from=build /build/adapter/target/adapter.jar /app/adapter.jar
EXPOSE 8080
CMD ["java", "-jar", "/app/adapter.jar"]
