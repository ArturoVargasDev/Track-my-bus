// src/utils/cookie.utils.js
// Configuracion centralizada de flags de seguridad para cookies de sesion.

const IS_PROD = process.env.NODE_ENV === 'production';

/**
 * En produccion se usa SameSite=None para permitir cookies en redirects
 * cross-site como Google OAuth (Google -> backend -> frontend).
 * En desarrollo se usa SameSite=Strict para mayor seguridad.
 */
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   IS_PROD,
  sameSite: IS_PROD ? 'None' : 'Strict',
  maxAge:   7 * 24 * 60 * 60 * 1000,
  path:     '/',
};

export function setSessionCookie(res, token) {
  res.cookie('session_token', token, COOKIE_OPTIONS);
}

export function clearSessionCookie(res) {
  res.clearCookie('session_token', {
    httpOnly: true,
    secure:   IS_PROD,
    sameSite: IS_PROD ? 'None' : 'Strict',
    path:     '/',
  });
}
