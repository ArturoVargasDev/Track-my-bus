import pool from '../config/db.js';

export async function listar(req, res, next) {
  const { zona_id, empresa_id, tipo } = req.query;
  let sql = `SELECT r.*,e.nombre as empresa,z.nombre as zona
             FROM rutas r JOIN empresas e ON e.id=r.empresa_id JOIN zonas z ON z.id=r.zona_id
             WHERE r.activo=1`;
  const params = [];
  if (zona_id)    { sql += ' AND r.zona_id=?';    params.push(zona_id); }
  if (empresa_id) { sql += ' AND r.empresa_id=?'; params.push(empresa_id); }
  if (tipo)       { sql += ' AND r.tipo=?';       params.push(tipo); }
  sql += ' ORDER BY r.nombre';
  try { res.json((await pool.query(sql, params))[0]); }
  catch(err) { next(err); }
}

export async function obtener(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT r.*,e.nombre as empresa,z.nombre as zona
       FROM rutas r JOIN empresas e ON e.id=r.empresa_id JOIN zonas z ON z.id=r.zona_id
       WHERE r.id=?`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Ruta no encontrada' });
    res.json(rows[0]);
  } catch(err) { next(err); }
}

export async function crear(req, res, next) {
  const { empresa_id, zona_id, nombre, clave, tipo, color_hex, accesible, precio } = req.body;
  if (!empresa_id || !zona_id || !nombre)
    return res.status(400).json({ error: 'empresa_id, zona_id y nombre son requeridos' });
  try {
    const [r] = await pool.query(
      `INSERT INTO rutas (empresa_id,zona_id,nombre,clave,tipo,color_hex,accesible,precio)
       VALUES (?,?,?,?,?,?,?,?)`,
      [empresa_id, zona_id, nombre, clave||null, tipo||'urbana', color_hex||'#2563EB', accesible?1:0, precio||0]
    );
    res.status(201).json({ id: r.insertId, nombre });
  } catch(err) { next(err); }
}

export async function actualizar(req, res, next) {
  const { nombre, clave, tipo, color_hex, accesible, precio } = req.body;
  try {
    await pool.query('UPDATE rutas SET nombre=?,clave=?,tipo=?,color_hex=?,accesible=?,precio=? WHERE id=?',
      [nombre, clave, tipo, color_hex, accesible?1:0, precio||0, req.params.id]);
    res.json({ message: 'Ruta actualizada' });
  } catch(err) { next(err); }
}

export async function desactivar(req, res, next) {
  try {
    await pool.query('UPDATE rutas SET activo=0 WHERE id=?', [req.params.id]);
    res.json({ message: 'Ruta desactivada' });
  } catch(err) { next(err); }
}

export async function obtenerPolyline(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT orden,latitud,longitud FROM ruta_polyline WHERE ruta_id=? ORDER BY orden',
      [req.params.id]
    );
    res.json(rows);
  } catch(err) { next(err); }
}

export async function guardarPolyline(req, res, next) {
  const { puntos } = req.body;
  if (!Array.isArray(puntos) || !puntos.length)
    return res.status(400).json({ error: 'puntos debe ser un arreglo no vacío' });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM ruta_polyline WHERE ruta_id=?', [req.params.id]);
    const values = puntos.map(p => [req.params.id, p.orden, p.latitud, p.longitud]);
    await conn.query('INSERT INTO ruta_polyline (ruta_id,orden,latitud,longitud) VALUES ?', [values]);
    await conn.commit();
    res.json({ message: 'Polyline guardada', puntos: puntos.length });
  } catch(err) { await conn.rollback(); next(err); }
  finally { conn.release(); }
}