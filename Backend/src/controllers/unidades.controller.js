// src/controllers/unidades.controller.js

import pool from '../config/db.js';

export async function listar(req, res, next) {
  const { empresa_id } = req.query;
  let sql = `
    SELECT u.*, e.nombre as empresa
    FROM unidades u
    JOIN empresas e ON e.id = u.empresa_id
    WHERE u.activo = 1
  `;
  const params = [];
  if (empresa_id) { sql += ' AND u.empresa_id = ?'; params.push(empresa_id); }
  sql += ' ORDER BY u.numero_economico';
  try { res.json((await pool.query(sql, params))[0]); }
  catch(err) { next(err); }
}

export async function obtener(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT u.*, e.nombre as empresa FROM unidades u JOIN empresas e ON e.id = u.empresa_id WHERE u.id = ?',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Unidad no encontrada' });
    res.json(rows[0]);
  } catch(err) { next(err); }
}

export async function crear(req, res, next) {
  const { empresa_id, numero_economico, placa, marca, modelo, anio, capacidad, accesible, foto_url } = req.body;
  if (!empresa_id || !numero_economico || !placa)
    return res.status(400).json({ error: 'empresa_id, numero_economico y placa son requeridos' });
  try {
    const [r] = await pool.query(
      `INSERT INTO unidades (empresa_id,numero_economico,placa,marca,modelo,anio,capacidad,accesible,foto_url)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [empresa_id, numero_economico, placa, marca, modelo, anio, capacidad, accesible?1:0, foto_url]
    );
    res.status(201).json({ id: r.insertId, placa });
  } catch(err) { next(err); }
}

export async function actualizar(req, res, next) {
  const { numero_economico, placa, marca, modelo, anio, capacidad, accesible, foto_url } = req.body;
  try {
    await pool.query(
      'UPDATE unidades SET numero_economico=?,placa=?,marca=?,modelo=?,anio=?,capacidad=?,accesible=?,foto_url=? WHERE id=?',
      [numero_economico, placa, marca, modelo, anio, capacidad, accesible?1:0, foto_url, req.params.id]
    );
    res.json({ message: 'Unidad actualizada' });
  } catch(err) { next(err); }
}

export async function desactivar(req, res, next) {
  try {
    await pool.query('UPDATE unidades SET activo=0 WHERE id=?', [req.params.id]);
    res.json({ message: 'Unidad desactivada' });
  } catch(err) { next(err); }
}
