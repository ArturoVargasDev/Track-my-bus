// src/utils/ticket-signer.utils.js
// Firma y verificacion de boletos QR mediante ECDSA con curva P-256.
// Requiere las variables ECDSA_PRIVATE_KEY y ECDSA_PUBLIC_KEY en .env

import { createSign, createVerify } from 'crypto';

const PRIVATE_KEY = process.env.ECDSA_PRIVATE_KEY?.replace(/\\n/g, '\n');
const PUBLIC_KEY  = process.env.ECDSA_PUBLIC_KEY?.replace(/\\n/g, '\n');

if (!PRIVATE_KEY || !PUBLIC_KEY)
  throw new Error('Faltan variables ECDSA_PRIVATE_KEY o ECDSA_PUBLIC_KEY en .env');

/**
 * Serializa el payload de forma determinista ordenando las claves
 * alfabeticamente, garantizando el mismo string en firma y verificacion.
 * @param {object} obj
 * @returns {string}
 */
function canonicalize(obj) {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(obj).sort(([a], [b]) => a.localeCompare(b))
    )
  );
}

/**
 * Firma el payload de un boleto con ECDSA P-256.
 * @param {{
 *   boleto_id:    number,
 *   usuario_id:   number,
 *   ruta_id:      number,
 *   qr_token:     string,
 *   valido_hasta: string
 * }} payload
 * @returns {string} Firma en formato base64
 */
export function signTicket(payload) {
  const sign = createSign('SHA256');
  sign.update(canonicalize(payload));
  sign.end();
  return sign.sign(PRIVATE_KEY, 'base64');
}

/**
 * Verifica la firma ECDSA de un boleto escaneado.
 * Permite detectar boletos falsificados o alterados sin consultar la base de datos.
 * @param {object} payload   - Mismo payload usado al firmar
 * @param {string} signature - Firma en base64
 * @returns {boolean}
 */
export function verifyTicket(payload, signature) {
  if (!payload || !signature) return false;
  try {
    const verify = createVerify('SHA256');
    verify.update(canonicalize(payload));
    verify.end();
    return verify.verify(PUBLIC_KEY, signature, 'base64');
  } catch {
    return false;
  }
}
