import express, { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from '../../swagger.json';

const router: Router = express.Router();

// Serve Swagger UI (combined serve + setup in a single middleware)
router.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

export default router;
