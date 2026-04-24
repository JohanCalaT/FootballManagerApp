import swaggerJSDoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FootballManagerApp API',
      version: '1.0.0',
      description: 'API for FootballManagerApp',
    },
    servers: [
      {
        url: 'http://localhost:3000',
      },
    ],
  },
  apis: ['./src/routes/*.ts'], // read routes for annotations
};

export const swaggerSpec = swaggerJSDoc(options);
