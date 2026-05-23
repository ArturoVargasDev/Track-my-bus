// src/controllers/pagos.controller.js
// La referencia de Stripe se cifra con AES-256-GCM antes de persistir en DB.

import Stripe from 'stripe';
import pool   from '../config/db.js';
import { encrypt, decrypt } from '../utils/crypto.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function crearPaymentIntent(req, res, next) {
  const { monto, ruta_nombre } = req.body;
  if (!monto) return res.status(400).json({ error: 'monto es requerido' });
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(monto * 100),
      currency: 'mxn',
      description: `Boleto estudiantil - ${ruta_nombre || 'Track My Bus'}`,
      automatic_payment_methods: { enabled: true },
    });

    // Cifrar el payment intent ID antes de guardarlo en la columna referencia.
    const referenciaEncriptada = encrypt(paymentIntent.id);
    await pool.query(
      `INSERT INTO pagos (boleto_id, usuario_id, monto, metodo, referencia, estado)
       SELECT b.id, b.usuario_id, ?, 'tarjeta', ?, 'pendiente'
       FROM boletos b
       WHERE b.usuario_id = ? AND b.estado = 'pagado'
       ORDER BY b.created_at DESC LIMIT 1`,
      [monto, referenciaEncriptada, req.user.id]
    );

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch(err) { next(err); }
}

export async function obtenerReferencia(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT referencia FROM pagos WHERE id = ? AND usuario_id = ?',
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Pago no encontrado' });
    res.json({ referencia: decrypt(rows[0].referencia) });
  } catch(err) { next(err); }
}