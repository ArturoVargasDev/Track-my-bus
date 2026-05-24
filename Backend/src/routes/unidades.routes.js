import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import * as ctrl from '../controllers/unidades.controller.js';

const router = Router();
router.get   ('/',    authenticate,                               ctrl.listar);
router.get   ('/:id', authenticate,                               ctrl.obtener);
router.post  ('/',    authenticate, authorize('admin','operador'), ctrl.crear);
router.put   ('/:id', authenticate, authorize('admin','operador'), ctrl.actualizar);
router.patch ('/:id', authenticate, authorize('admin','operador'), ctrl.actualizar);
router.delete('/:id', authenticate, authorize('admin','operador'), ctrl.desactivar);
export default router;