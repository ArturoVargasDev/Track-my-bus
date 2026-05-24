// src/config/passport.js
// Configuracion de Passport con estrategia Google OAuth 2.0.

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import pool from './db.js';

passport.use(new GoogleStrategy(
  {
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  process.env.GOOGLE_CALLBACK_URL,
  },
  async (_accessToken, _refreshToken, profile, done) => {
    try {
      const email     = profile.emails?.[0]?.value;
      const nombre    = profile.name?.givenName  || profile.displayName;
      const apellidos = profile.name?.familyName || '';

      if (!email) return done(new Error('No se pudo obtener el email de Google'), null);

      const [rows] = await pool.query(
        `SELECT u.id, u.nombre, u.apellidos, u.email, u.rol_id,
                u.activo, u.es_estudiante, u.credencial_valida, u.foto_url,
                r.nombre as rol
         FROM usuarios u JOIN roles r ON r.id = u.rol_id
         WHERE u.email = ?`,
        [email]
      );

      if (rows.length) {
        const user = rows[0];
        if (!user.activo) return done(null, false, { message: 'Cuenta desactivada' });
        return done(null, user);
      }

      const [result] = await pool.query(
        `INSERT INTO usuarios (rol_id, nombre, apellidos, email, password_hash)
         VALUES (4, ?, ?, ?, '')`,
        [nombre, apellidos, email]
      );

      const [newUser] = await pool.query(
        `SELECT u.id, u.nombre, u.apellidos, u.email, u.rol_id,
                u.activo, u.es_estudiante, u.credencial_valida, u.foto_url,
                r.nombre as rol
         FROM usuarios u JOIN roles r ON r.id = u.rol_id
         WHERE u.id = ?`,
        [result.insertId]
      );

      return done(null, newUser[0]);
    } catch (err) {
      return done(err, null);
    }
  }
));

export default passport;
