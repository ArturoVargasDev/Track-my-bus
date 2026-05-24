// src/routes/analytics.routes.js
import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import * as ctrl from '../controllers/analytics.controller.js';

const router = Router();

router.get('/resumen',                 authenticate, authorize('admin','operador'), ctrl.resumen);
router.get('/diario',                  authenticate, authorize('admin','operador'), ctrl.diario);
router.get('/demanda',                 authenticate, authorize('admin','operador'), ctrl.demanda);
router.get('/velocidades',             authenticate, authorize('admin','operador'), ctrl.velocidades);
router.get('/boletos-por-dia',         authenticate, authorize('admin','operador'), ctrl.boletosPorDia);
router.get('/incidencias-por-tipo',    authenticate, authorize('admin','operador'), ctrl.incidenciasPorTipo);
router.get('/top-retrasos',            authenticate, authorize('admin','operador'), ctrl.topRetrasos);
router.get('/mantenimiento-pendiente', authenticate, authorize('admin','operador'), ctrl.mantenimientoPendiente);

export default router;
