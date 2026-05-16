import express from 'express';
import cors from 'cors';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import routes from './routes';
import { swaggerSpec } from './config/swagger';
import { errorHandler } from './middleware/error.middleware';
import { populateAuthContext } from './middleware/auth.middleware';
import { countRequest } from './middleware/request-counter.middleware';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// View engine setup for Pug
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Contexto auth global — popula req.userId / req.isAdmin sin bloquear.
// Las rutas que requieran usuario o admin usan requireUser / requireAdmin.
app.use(populateAuthContext);

// Contador de peticiones para el panel /status (matrícula TRWM)
app.use(countRequest);

// Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/', routes);

// Error Handler — siempre el último para capturar todo lo que delega next(err)
app.use(errorHandler);

export default app;
