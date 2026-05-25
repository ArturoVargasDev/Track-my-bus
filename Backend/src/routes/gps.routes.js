import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import * as ctrl from '../controllers/gps.controller.js';

const router = Router();
router.post('/ping',                 authenticate, authorize('conductor'),        ctrl.ping);
router.get ('/live',                 ctrl.live);                                           // publico
router.get ('/historial/:unidad_id', authenticate, authorize('admin','operador'), ctrl.historial);
export default router;
