// src/utils/cookie.utils.js
// Configuracion centralizada de flags de seguridad para cookies de sesion.

const IS_PROD = process.env.NODE_ENV === 'production';

/**
 * Opciones de seguridad para la cookie de sesion.
 *
 * httpOnly - Impide que JavaScript del cliente acceda a la cookie,
 *            mitigando ataques de tipo XSS.
 * secure   - Restringe la transmision de la cookie a conexiones HTTPS.
 *            Activo unicamente en produccion.
 * sameSite - Bloquea el envio de la cookie en solicitudes cross-site,
 *            mitigando ataques de tipo CSRF.
 * maxAge   - Tiempo de vida de la cookie: 7 dias en milisegundos.
 */
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   IS_PROD,
  sameSite: 'Strict',
  maxAge:   7 * 24 * 60 * 60 * 1000,
  path:     '/',
};

/**
 * Establece la cookie de sesion segura en la respuesta HTTP.
 * @param {import('express').Response} res
 * @param {string} token - JWT generado en el login
 */
export function setSessionCookie(res, token) {
  res.cookie('session_token', token, COOKIE_OPTIONS);
}

/**
 * Elimina la cookie de sesion. Se invoca durante el logout.
 * @param {import('express').Response} res
 */
export function clearSessionCookie(res) {
  res.clearCookie('session_token', {
    httpOnly: true,
    secure:   IS_PROD,
    sameSite: 'Strict',
    path:     '/',
  });
}
