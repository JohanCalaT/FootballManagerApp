# FootballManagerApp ⚽

Plataforma integral de alto rendimiento para la gestión de jugadores y estadísticas de fútbol, diseñada con una arquitectura de microservicios distribuida y políglota.

![.NET 10](https://img.shields.io/badge/.NET_10-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)
![Angular](https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white)
![Ionic](https://img.shields.io/badge/Ionic-3880FF?style=for-the-badge&logo=ionic&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Azure](https://img.shields.io/badge/Azure-0078D4?style=for-the-badge&logo=microsoftazure&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)

---

## Descripción

FootballManagerApp permite la búsqueda, importación y gestión de perfiles de jugadores profesionales utilizando APIs externas y almacenamiento local persistente. El sistema ofrece visualización de estadísticas avanzadas, gestión de noticias en tiempo real y generación de alineaciones mediante Inteligencia Artificial.

### Contexto Académico

Este proyecto se desarrolla como una solución unificada para las siguientes asignaturas del Máster en Ingeniería Informática (UAL):

| Asignatura | Siglas | Enfoque Principal |
|------------|--------|-------------------|
| Desarrollo Web en el Servidor Cliente | **DWSC** | Backend .NET, Microservicios y Orquestación con Aspire |
| Tecnologías de Red y Web Móvil | **TRWM** | Backend Node.js, Patrón TRWM y MongoDB |
| Desarrollo de Aplicaciones Híbridas | **DAH** | Frontend móvil/web con Ionic, Angular y Capacitor |
| Diseño de Sistemas Software | **DSS** | Arquitectura, Patrones de Diseño y Calidad |

---

## Arquitectura

El sistema utiliza un patrón de microservicios orquestados, con un punto de entrada unificado mediante un Gateway.

```mermaid
graph TD
    UI[Ionic/Angular Frontend] --> GW[YARP API Gateway]
    GW --> Aspire[.NET Aspire Host]
    Aspire --> PAPI[Players.API .NET]
    Aspire --> CAPI[Comments.API .NET]
    GW --> Node[Express Backend Node.js]
    PAPI --> PG[(PostgreSQL)]
    CAPI --> PG
    Node --> Mongo[(MongoDB)]
    PAPI --> Redis[(Redis Shared Cache)]
    Node --> Redis
    PAPI -.-> Firebase{Firebase Auth}
    Node -.-> Firebase
    PAPI -.-> External[API-Football / Azure Blob]
```

---

## Stack Tecnológico

| Capa | Tecnologías |
|------|-------------|
| **Frontend** | ![Angular](https://img.shields.io/badge/Angular-DD0031?style=flat-square&logo=angular&logoColor=white) ![Ionic](https://img.shields.io/badge/Ionic-3880FF?style=flat-square&logo=ionic&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white) |
| **API Gateway** | ![.NET](https://img.shields.io/badge/.NET_10-512BD4?style=flat-square&logo=dotnet&logoColor=white) ![YARP](https://img.shields.io/badge/YARP-Reverse_Proxy-blue?style=flat-square) |
| **Backend .NET** | ![.NET](https://img.shields.io/badge/.NET_10-512BD4?style=flat-square&logo=dotnet&logoColor=white) ![Aspire](https://img.shields.io/badge/Aspire-Orchestrator-blue?style=flat-square) ![Entity Framework](https://img.shields.io/badge/EF_Core-DB_Access-purple?style=flat-square) |
| **Backend Node** | ![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white) ![Express](https://img.shields.io/badge/Express.js-000000?style=flat-square&logo=express&logoColor=white) ![Mongoose](https://img.shields.io/badge/Mongoose-DB_ODM-red?style=flat-square) |
| **Persistencia** | ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white) ![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white) ![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white) |
| **DevOps & Cloud** | ![Azure](https://img.shields.io/badge/Azure-0078D4?style=flat-square&logo=microsoftazure&logoColor=white) ![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white) ![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=flat-square&logo=githubactions&logoColor=white) |

---

## Estructura del Repositorio

```text
/FootballManagerApp
├── /backend-node              # Backend Express + MongoDB (TRWM)
│   ├── /src/controllers       # Controladores de la API
│   ├── /src/models           # Esquemas de Mongoose
│   └── /tests                # Pruebas unitarias con Jest
├── /frontend                  # Cliente Ionic + Angular (DAH)
│   ├── /src/app/core         # Servicios globales e interceptores
│   └── /src/app/features     # Módulos de funcionalidad (jugadores, noticias)
└── /src/FootballManagerApp    # Ecosistema .NET (DWSC)
    ├── /AppHost               # Orquestador .NET Aspire
    ├── /Gateway               # YARP API Gateway
    ├── /Players.API           # Microservicio de Jugadores (PostgreSQL)
    └── /Comments.API          # Microservicio de Comentarios
```

---

## Cómo ejecutar en local

### Prerrequisitos
- **.NET SDK**: 10.0+
- **Node.js**: 20.x+
- **Docker Desktop**: Con soporte para contenedores Linux
- **Angular CLI**: 17.x+
- **Ionic CLI**: 7.x+

### Pasos

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/JohanCalaT/FootballManagerApp.git
   cd FootballManagerApp
   ```

2. **Configurar variables de entorno**
   Copia los archivos `.env.example` a `.env` en las carpetas correspondientes y añade tus credenciales de Firebase y API-Football.

3. **Ejecutar con .NET Aspire** (Recomendado)
   ```bash
   cd src/FootballManagerApp/FootballManagerApp.AppHost
   dotnet run
   ```
   Esto levantará automáticamente las bases de datos (PostgreSQL, MongoDB, Redis) en contenedores y todos los microservicios.

4. **Acceder al Dashboard**
   Aspire proporcionará una URL (normalmente `http://localhost:15000`) donde podrás ver el estado de todos los servicios y sus logs.

---

## CI/CD y Despliegue

### Flujo de Trabajo (GitFlow)
- **`main`**: Rama protegida para producción. Solo acepta merges desde `develop`.
- **`develop`**: Rama base para integración (Staging).
- **`feature/*`**: Ramas para el desarrollo de nuevas características.

### Entornos de Despliegue

| Entorno | Rama | Hosting | URL |
|---------|------|---------|-----|
| **Producción** | `main` | Azure Container Apps | `https://footballmanager.azureapps.io` |
| **Staging** | `develop` | Azure Container Apps | `https://footballmanager-staging.azureapps.io` |

---

## Testing

| Capa | Framework | Tipo de Tests |
|------|-----------|---------------|
| **Backend .NET** | xUnit / NUnit | Unitarios, Integración |
| **Backend Node** | Jest | Unitarios (Servicios/Controllers) |
| **Frontend** | Karma / Jasmine | Unitarios de Componentes |
| **E2E** | Cypress | Flujos de usuario completos |

---

**Johan Cala — Máster en Ingeniería Informática, UAL**
