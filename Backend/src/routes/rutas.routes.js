import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import * as ctrl from '../controllers/rutas.controller.js';

const router = Router();
router.get   ('/',             ctrl.listar);                                              // publico
router.get   ('/:id',          ctrl.obtener);                                             // publico
router.get   ('/:id/polyline', ctrl.obtenerPolyline);                                     // publico
router.post  ('/',             authenticate, authorize('admin','operador'), ctrl.crear);
router.put   ('/:id',          authenticate, authorize('admin','operador'), ctrl.actualizar);
router.patch ('/:id',          authenticate, authorize('admin','operador'), ctrl.actualizar);
router.delete('/:id',          authenticate, authorize('admin','operador'), ctrl.desactivar);
router.put   ('/:id/polyline', authenticate, authorize('admin','operador'), ctrl.guardarPolyline);
export default router;
