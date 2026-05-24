// src/routes/auth.routes.js

import { Router }  from 'express';
import jwt         from 'jsonwebtoken';
import passport    from '../config/passport.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { registroRules, loginRules, validate } from '../middlewares/validator.middleware.js';
import { setSessionCookie } from '../utils/cookie.utils.js';
import * as ctrl from '../controllers/auth.controller.js';

const router = Router();

router.post('/registro', registroRules, validate, ctrl.registro);
router.post('/login',    loginRules,    validate, ctrl.login);
router.post('/logout',                            ctrl.logout);
router.get ('/me',        authenticate,           ctrl.me);

router.patch('/credencial',     authenticate,                               ctrl.subirCredencial);
router.patch('/credencial/:id', authenticate, authorize('admin','operador'), ctrl.validarCredencial);
router.patch('/password',       authenticate,                               ctrl.cambiarPassword);

router.get  ('/estudiantes',    authenticate, authorize('admin','operador'), ctrl.listarEstudiantes);
router.get  ('/usuarios',       authenticate, authorize('admin'),            ctrl.listarUsuarios);
router.post ('/usuarios',       authenticate, authorize('admin'),            ctrl.crearUsuario);

// Cualquier usuario puede editar su propio perfil — la validacion de permisos esta en el controller
router.patch('/usuarios/:id',        authenticate, ctrl.actualizarUsuario);
router.patch('/usuarios/:id/rol',    authenticate, authorize('admin'), ctrl.cambiarRol);
router.patch('/usuarios/:id/activo', authenticate, authorize('admin'), ctrl.toggleActivo);

// Google OAuth
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get('/google/callback',
  passport.authenticate('google', {
    session:         false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=google`,
  }),
  async (req, res) => {
    try {
      const user  = req.user;
      const token = jwt.sign(
        { id: user.id, rol_id: user.rol_id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );
      const expira = new Date();
      expira.setDate(expira.getDate() + 7);
      const pool = (await import('../config/db.js')).default;
      await pool.query(
        'INSERT INTO sesiones (usuario_id, token, expira_at) VALUES (?, ?, ?)',
        [user.id, token, expira]
      );
      setSessionCookie(res, token);
      const userData = encodeURIComponent(JSON.stringify({
        id:               user.id,
        nombre:           user.nombre,
        apellidos:        user.apellidos,
        email:            user.email,
        rol:              user.rol,
        rol_id:           user.rol_id,
        es_estudiante:    user.es_estudiante,
        credencial_valida: user.credencial_valida,
          foto_url:         user.foto_url || null,
      }));
      res.redirect(`${process.env.FRONTEND_URL}/auth/google/success?user=${userData}`);
    } catch (err) {
      console.error('Google callback error:', err);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=google`);
    }
  }
);

export default router;
