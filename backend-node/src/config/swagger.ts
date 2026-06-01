import path from 'path';
import swaggerJSDoc from 'swagger-jsdoc';

const port = process.env.PORT ?? '3000';

// El spec se construye escaneando los bloques JSDoc @swagger del filesystem.
// En dev este archivo es .ts dentro de src/; en producción es .js dentro de
// dist/ (el contenedor solo copia dist/, ver Dockerfile). Resolvemos las rutas
// relativas a __dirname con la extensión real del módulo en ejecución para que
// el glob acierte en ambos entornos (antes apuntaba fijo a ./src/**/*.ts y en
// deploy no encontraba nada → paths vacío).
const ext = path.extname(__filename); // '.ts' en dev, '.js' en prod

// Origen que Swagger UI usa en "Try it out". Tras el Gateway YARP debe ser la
// URL pública del gateway (SWAGGER_SERVER_URL); en local cae a localhost.
const serverUrl = process.env.SWAGGER_SERVER_URL ?? `http://localhost:${port}`;

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FootballManagerApp · Node Backend',
      version: '1.0.0',
      description:
        'API REST espejo del backend .NET sobre MongoDB. ' +
        'Cumple TRWM: carga API-Football, modelo Mongoose con comments y ' +
        'statistics anidados, CRUD principal + anidado, JWT vía Gateway, ' +
        'Jest+Supertest, panel /status (matrícula).',
    },
    servers: [
      { url: serverUrl },
    ],
    tags: [
      { name: 'Players',   description: 'CRUD jugadores + import API-Football' },
      { name: 'Comments',  description: 'Comentarios anidados en jugador' },
      { name: 'IdealTeam', description: 'Generación de equipo ideal vía Gemini' },
      { name: 'System',    description: 'Health, status (Pug), Swagger' },
    ],
    components: {
      securitySchemes: {
        XUserId:    { type: 'apiKey', in: 'header', name: 'X-User-Id' },
        XUserAdmin: { type: 'apiKey', in: 'header', name: 'X-User-Admin' },
      },
    },
  },
  apis: [
    path.join(__dirname, `../routes/*${ext}`),
    path.join(__dirname, `../controllers/*${ext}`),
  ],
};

export const swaggerSpec = swaggerJSDoc(options);
