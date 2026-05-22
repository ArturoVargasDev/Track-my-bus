import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import * as ctrl from '../controllers/pagos.controller.js';

const router = Router();

router.post('/create-payment-intent', authenticate, ctrl.crearPaymentIntent);

export default router;