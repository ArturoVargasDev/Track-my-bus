// src/controllers/boletos.controller.js
// Controlador de boletos con verificacion de integridad HMAC-SHA256.

import pool   from '../config/db.js';
import crypto from 'crypto';
import { buildSignedToken, verifySignedToken } from '../utils/hmac.utils.js';

export async function comprar(req, res, next) {
  const { ruta_id, valido_desde, valido_hasta, precio } = req.body;
  if (!ruta_id || !valido_desde || !valido_hasta || precio === undefined || precio === null)
    return res.status(400).json({ error: 'ruta_id, valido_desde, valido_hasta y precio son requeridos' });

  const [u] = await pool.query('SELECT es_estudiante, credencial_valida FROM usuarios WHERE id=?', [req.user.id]);
  if (!u[0]?.es_estudiante || !u[0]?.credencial_valida)
    return res.status(403).json({ error: 'Solo estudiantes con credencial validada pueden comprar boletos' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // El qr_token incluye una firma HMAC para verificar que no fue alterado.
    // Formato: <uuid>.<hmac_sha256>
    const qr_token = buildSignedToken(crypto.randomUUID());

    const [r] = await conn.query(
      `INSERT INTO boletos (usuario_id,ruta_id,qr_token,precio,estado,valido_desde,valido_hasta)
       VALUES (?,?,?,?,'pagado',?,?)`,
      [req.user.id, ruta_id, qr_token, precio, valido_desde, valido_hasta]
    );
    await conn.query(
      `INSERT INTO pagos (boleto_id,usuario_id,monto,metodo,estado) VALUES (?,?,?,'tarjeta','completado')`,
      [r.insertId, req.user.id, precio]
    );
    await conn.commit();
    res.status(201).json({ id: r.insertId, qr_token, mensaje: 'Boleto generado' });
  } catch(err) { await conn.rollback(); next(err); }
  finally { conn.release(); }
}

export async function misBoletos(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT b.*,r.nombre as ruta FROM boletos b JOIN rutas r ON r.id=b.ruta_id
       WHERE b.usuario_id=? ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch(err) { next(err); }
}

export async function validar(req, res, next) {
  const { qr_token, unidad_id } = req.body;
  if (!qr_token || !unidad_id)
    return res.status(400).json({ error: 'qr_token y unidad_id son requeridos' });
  try {
    // Verificar integridad del token antes de consultar la base de datos.
    // Si la firma no coincide, el token fue alterado o es falso.
    const { valid } = verifySignedToken(qr_token);
    if (!valid)
      return res.status(400).json({ error: 'Token invalido o alterado', valido: false });

    const [rows] = await pool.query('SELECT * FROM boletos WHERE qr_token=?', [qr_token]);
    if (!rows.length) return res.status(404).json({ error: 'Boleto no encontrado' });

    const b = rows[0];
    const ahora = new Date();

    if (b.estado !== 'pagado')
      return res.status(400).json({ error: `Boleto ${b.estado}`, valido: false });
    if (new Date(b.valido_hasta) < ahora)
      return res.status(400).json({ error: 'Boleto expirado', valido: false });
    if (new Date(b.valido_desde) > ahora)
      return res.status(400).json({ error: 'Boleto aun no valido', valido: false });

    await pool.query(
      `UPDATE boletos SET estado='usado', usado_at=NOW(), unidad_id=? WHERE id=?`,
      [unidad_id, b.id]
    );
    res.json({ valido: true, mensaje: 'Boleto validado correctamente', boleto_id: b.id });
  } catch(err) { next(err); }
}

export async function obtener(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT b.*,r.nombre as ruta FROM boletos b JOIN rutas r ON r.id=b.ruta_id WHERE b.id=?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Boleto no encontrado' });
    if (rows[0].usuario_id !== req.user.id && req.user.rol_id > 2)
      return res.status(403).json({ error: 'Sin acceso a este boleto' });
    res.json(rows[0]);
  } catch(err) { next(err); }
}
