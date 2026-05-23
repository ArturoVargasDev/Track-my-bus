import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { registroRules, loginRules, validate } from '../middlewares/validator.middleware.js';
import * as ctrl from '../controllers/auth.controller.js';

const router = Router();

router.post('/registro', registroRules, validate, ctrl.registro);
router.post('/login',    loginRules,    validate, ctrl.login);
router.post('/logout',                            ctrl.logout);
router.get ('/me',        authenticate,           ctrl.me);
router.patch('/credencial', authenticate,         ctrl.subirCredencial);
router.patch('/credencial/:id', authenticate, authorize('admin','operador'), ctrl.validarCredencial);
router.get('/estudiantes', authenticate, authorize('admin','operador'), ctrl.listarEstudiantes);
router.get('/usuarios',    authenticate, authorize('admin'),            ctrl.listarUsuarios);
router.post('/usuarios',   authenticate, authorize('admin'),            ctrl.crearUsuario);
router.patch('/usuarios/:id/rol',    authenticate, authorize('admin'), ctrl.cambiarRol);
router.patch('/usuarios/:id/activo', authenticate, authorize('admin'), ctrl.toggleActivo);

export default router;