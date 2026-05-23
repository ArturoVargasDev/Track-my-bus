// src/utils/hmac.utils.js
// Funciones de firma y verificacion HMAC-SHA256 para tokens sensibles.
// Requiere la variable de entorno HMAC_SECRET en el archivo .env

import { createHmac, timingSafeEqual } from 'crypto';

const HMAC_SECRET = process.env.HMAC_SECRET;
if (!HMAC_SECRET) throw new Error('Variable de entorno HMAC_SECRET no definida');

/**
 * Genera una firma HMAC-SHA256 para el valor proporcionado.
 * @param {string} value - Valor a firmar
 * @returns {string} Firma en formato hexadecimal
 */
export function signHmac(value) {
  return createHmac('sha256', HMAC_SECRET)
    .update(String(value))
    .digest('hex');
}

/**
 * Verifica que un valor coincida con su firma HMAC-SHA256.
 * Utiliza comparacion en tiempo constante para prevenir timing attacks.
 * @param {string} value     - Valor original
 * @param {string} signature - Firma hexadecimal a verificar
 * @returns {boolean}
 */
export function verifyHmac(value, signature) {
  if (!value || !signature) return false;
  try {
    const expected = Buffer.from(signHmac(value), 'hex');
    const received = Buffer.from(signature, 'hex');
    if (expected.length !== received.length) return false;
    return timingSafeEqual(expected, received);
  } catch {
    return false;
  }
}

/**
 * Construye un qr_token firmado con HMAC.
 * Formato resultante: <uuid>.<firma_hex>
 * @param {string} uuid - UUID v4 del boleto
 * @returns {string}
 */
export function buildSignedToken(uuid) {
  return `${uuid}.${signHmac(uuid)}`;
}

/**
 * Verifica y desempaqueta un token firmado.
 * @param {string} signedToken - Token con formato <uuid>.<firma_hex>
 * @returns {{ valid: boolean, uuid: string|null }}
 */
export function verifySignedToken(signedToken) {
  if (!signedToken) return { valid: false, uuid: null };
  const dot  = signedToken.lastIndexOf('.');
  if (dot === -1) return { valid: false, uuid: null };
  const uuid = signedToken.substring(0, dot);
  const sig  = signedToken.substring(dot + 1);
  const valid = verifyHmac(uuid, sig);
  return { valid, uuid: valid ? uuid : null };
}
