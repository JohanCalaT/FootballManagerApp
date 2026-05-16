import swaggerJSDoc from 'swagger-jsdoc';

const port = process.env.PORT ?? '3000';

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
      { url: `http://localhost:${port}` },
    ],
    tags: [
      { name: 'Players',  description: 'CRUD jugadores + import API-Football' },
      { name: 'Comments', description: 'Comentarios anidados en jugador' },
      { name: 'System',   description: 'Health, status (Pug), Swagger' },
    ],
    components: {
      securitySchemes: {
        XUserId:    { type: 'apiKey', in: 'header', name: 'X-User-Id' },
        XUserAdmin: { type: 'apiKey', in: 'header', name: 'X-User-Admin' },
      },
    },
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
  ],
};

export const swaggerSpec = swaggerJSDoc(options);
