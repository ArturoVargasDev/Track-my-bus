import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { boletoRules, validate } from '../middlewares/validator.middleware.js';
import * as ctrl from '../controllers/boletos.controller.js';

const router = Router();
router.post('/comprar',     authenticate, boletoRules, validate,              ctrl.comprar);
router.get ('/mis-boletos', authenticate,                                      ctrl.misBoletos);
router.post('/validar',     authenticate, authorize('conductor'),              ctrl.validar);
router.get ('/:id',         authenticate,                                      ctrl.obtener);
export default router;