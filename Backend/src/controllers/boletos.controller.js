// src/controllers/boletos.controller.js
// Controlador de boletos con integridad HMAC y firma digital ECDSA.

import pool   from '../config/db.js';
import crypto from 'crypto';
import { buildSignedToken, verifySignedToken } from '../utils/hmac.utils.js';
import { signTicket, verifyTicket }            from '../utils/ticket-signer.utils.js';

export async function comprar(req, res, next) {
  const { ruta_id, precio } = req.body;
  if (!ruta_id || precio === undefined || precio === null)
    return res.status(400).json({ error: 'ruta_id y precio son requeridos' });

  const [u] = await pool.query('SELECT es_estudiante, credencial_valida FROM usuarios WHERE id=?', [req.user.id]);
  if (!u[0]?.es_estudiante || !u[0]?.credencial_valida)
    return res.status(403).json({ error: 'Solo estudiantes con credencial validada pueden comprar boletos' });

  const [activos] = await pool.query(
    `SELECT id FROM boletos
     WHERE usuario_id = ? AND ruta_id = ? AND estado = 'pagado' AND valido_hasta > NOW()`,
    [req.user.id, ruta_id]
  );
  if (activos.length)
    return res.status(409).json({ error: 'Ya tienes un boleto activo para esta ruta' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const qr_token = buildSignedToken(crypto.randomUUID());

    const [r] = await conn.query(
      `INSERT INTO boletos (usuario_id, ruta_id, qr_token, precio, estado, valido_desde, valido_hasta)
       VALUES (?, ?, ?, ?, 'pagado', NOW(), DATE_ADD(NOW(), INTERVAL 1 MONTH))`,
      [req.user.id, ruta_id, qr_token, precio]
    );

    await conn.query(
      `INSERT INTO pagos (boleto_id, usuario_id, monto, metodo, estado) VALUES (?, ?, ?, 'tarjeta', 'completado')`,
      [r.insertId, req.user.id, precio]
    );
    await conn.commit();

    const [[boleto]] = await conn.query(
      'SELECT valido_desde, valido_hasta FROM boletos WHERE id = ?',
      [r.insertId]
    );

    const payload = {
      boleto_id:    r.insertId,
      qr_token,
      ruta_id,
      usuario_id:   req.user.id,
      valido_hasta: new Date(boleto.valido_hasta).toISOString(),
    };
    const firma = signTicket(payload);

    res.status(201).json({
      id:           r.insertId,
      qr_token,
      firma,
      qr_data:      JSON.stringify({ qr_token, firma }),
      valido_desde: boleto.valido_desde,
      valido_hasta: boleto.valido_hasta,
      mensaje:      'Boleto generado',
    });
  } catch(err) { await conn.rollback(); next(err); }
  finally { conn.release(); }
}

export async function misBoletos(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT b.*,
              r.nombre           as ruta,
              u.numero_economico as unidad_numero,
              u.placa            as unidad_placa
       FROM boletos b
       JOIN rutas r         ON r.id = b.ruta_id
       LEFT JOIN unidades u ON u.id = b.unidad_id
       WHERE b.usuario_id = ?
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch(err) { next(err); }
}

export async function obtenerQrData(req, res, next) {
  try {
    const [[boleto]] = await pool.query(
      'SELECT * FROM boletos WHERE id = ? AND usuario_id = ?',
      [req.params.id, req.user.id]
    );
    if (!boleto) return res.status(404).json({ error: 'Boleto no encontrado' });
    if (boleto.estado !== 'pagado')
      return res.status(400).json({ error: `Boleto ${boleto.estado}` });

    const payload = {
      boleto_id:    boleto.id,
      qr_token:     boleto.qr_token,
      ruta_id:      boleto.ruta_id,
      usuario_id:   boleto.usuario_id,
      valido_hasta: new Date(boleto.valido_hasta).toISOString(),
    };
    const firma = signTicket(payload);

    res.json({ qr_data: JSON.stringify({ qr_token: boleto.qr_token, firma }) });
  } catch(err) { next(err); }
}

export async function validar(req, res, next) {
  const { qr_token, firma, unidad_id } = req.body;
  if (!qr_token || !firma || !unidad_id)
    return res.status(400).json({ error: 'qr_token, firma y unidad_id son requeridos' });

  try {
    // Verificar integridad HMAC del token
    const { valid: hmacValido } = verifySignedToken(qr_token);
    if (!hmacValido)
      return res.status(400).json({ error: 'Token invalido o alterado', valido: false });

    // Obtener asignacion activa de la unidad para saber la ruta en servicio
    const [[asignacion]] = await pool.query(
      'SELECT ruta_id FROM asignaciones WHERE unidad_id = ? AND activo = 1',
      [unidad_id]
    );
    if (!asignacion)
      return res.status(400).json({ error: 'La unidad no tiene una ruta activa asignada', valido: false });

    const [rows] = await pool.query('SELECT * FROM boletos WHERE qr_token=?', [qr_token]);
    if (!rows.length) return res.status(404).json({ error: 'Boleto no encontrado' });

    const b     = rows[0];
    const ahora = new Date();

    if (b.estado !== 'pagado')
      return res.status(400).json({ error: `Boleto ${b.estado}`, valido: false });
    if (new Date(b.valido_hasta) < ahora)
      return res.status(400).json({ error: 'Boleto expirado', valido: false });
    if (new Date(b.valido_desde) > ahora)
      return res.status(400).json({ error: 'Boleto aun no valido', valido: false });

    // Verificar que el boleto sea de la ruta que opera la unidad
    if (b.ruta_id !== asignacion.ruta_id)
      return res.status(400).json({
        error: 'El boleto no corresponde a esta ruta',
        valido: false,
      });

    // Verificar firma ECDSA
    const payload = {
      boleto_id:    b.id,
      qr_token,
      ruta_id:      b.ruta_id,
      usuario_id:   b.usuario_id,
      valido_hasta: new Date(b.valido_hasta).toISOString(),
    };
    if (!verifyTicket(payload, firma))
      return res.status(403).json({ error: 'Firma digital invalida', valido: false });

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
      `SELECT b.*, r.nombre as ruta FROM boletos b JOIN rutas r ON r.id=b.ruta_id WHERE b.id=?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Boleto no encontrado' });
    if (rows[0].usuario_id !== req.user.id && req.user.rol_id > 2)
      return res.status(403).json({ error: 'Sin acceso a este boleto' });
    res.json(rows[0]);
  } catch(err) { next(err); }
}

export async function expirarBoletos(_req, res, next) {
  try {
    const [r] = await pool.query(
      `UPDATE boletos SET estado = 'expirado'
       WHERE estado = 'pagado' AND valido_hasta < NOW()`
    );
    res.json({ expirados: r.affectedRows });
  } catch(err) { next(err); }
}
