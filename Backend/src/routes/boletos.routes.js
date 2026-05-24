// src/routes/boletos.routes.js
import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import * as ctrl from '../controllers/boletos.controller.js';

const router = Router();

router.post('/comprar',       authenticate,                         ctrl.comprar);
router.get ('/mis-boletos',   authenticate,                         ctrl.misBoletos);
router.get ('/:id/qr',        authenticate,                         ctrl.obtenerQrData);
router.post('/validar',       authenticate, authorize('conductor'), ctrl.validar);
router.get ('/:id',           authenticate,                         ctrl.obtener);

export default router;
