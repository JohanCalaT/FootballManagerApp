import express from 'express';
import cors from 'cors';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import routes from './routes';
import { swaggerSpec } from './config/swagger';
import { errorHandler } from './middleware/error.middleware';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// View engine setup for Pug
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/', routes);

// Error Handler
app.use(errorHandler);

export default app;
