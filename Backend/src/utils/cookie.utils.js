// src/utils/cookie.utils.js
// Centraliza los flags de seguridad de la cookie de sesión.
const IS_PROD = process.env.NODE_ENV === 'production';

export const COOKIE_OPTIONS = {
  httpOnly: true,       // JS del navegador NO puede leer la cookie (mitiga XSS)
  secure:   IS_PROD,    // Solo HTTPS en producción; HTTP permitido en desarrollo
  sameSite: 'Strict',   // No se envía en requests cross-site (mitiga CSRF)
  maxAge:   7 * 24 * 60 * 60 * 1000, // 7 días en ms
  path:     '/',
};

export function setSessionCookie(res, token) {
  res.cookie('session_token', token, COOKIE_OPTIONS);
}

export function clearSessionCookie(res) {
  res.clearCookie('session_token', {
    httpOnly: true,
    secure:   IS_PROD,
    sameSite: 'Strict',
    path:     '/',
  });
}
