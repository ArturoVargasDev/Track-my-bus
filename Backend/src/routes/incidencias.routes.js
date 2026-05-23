import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { incidenciaRules, validate } from '../middlewares/validator.middleware.js';
import * as ctrl from '../controllers/incidencias.controller.js';

const router = Router();
router.get   ('/',             authenticate,                                       ctrl.listar);
router.post  ('/',             authenticate, incidenciaRules, validate,            ctrl.crear);
router.patch ('/:id/resolver', authenticate, authorize('admin','operador'),        ctrl.resolver);
export default router;