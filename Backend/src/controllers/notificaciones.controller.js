import pool from '../config/db.js';
import { encrypt } from '../utils/crypto.js';

export async function listar(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM notificaciones WHERE usuario_id=? ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json(rows);
  } catch(err) { next(err); }
}

export async function marcarLeida(req, res, next) {
  try {
    await pool.query('UPDATE notificaciones SET leida=1 WHERE id=? AND usuario_id=?',
      [req.params.id, req.user.id]);
    res.json({ message: 'Notificación marcada como leída' });
  } catch(err) { next(err); }
}

export async function marcarTodasLeidas(req, res, next) {
  try {
    await pool.query('UPDATE notificaciones SET leida=1 WHERE usuario_id=?', [req.user.id]);
    res.json({ message: 'Todas las notificaciones marcadas como leídas' });
  } catch(err) { next(err); }
}

export async function suscribirPush(req, res, next) {
  const { endpoint, p256dh, auth } = req.body;
  if (!endpoint || || !auth)
    return res.status(400).json({ error: 'endpoint, p256dh y auth son requeridos' });
  try {
    // p256dh y auth son claves criptograficas de la suscripcion Web Push.
    // Se cifran con AES-256-GCM antes de persistir para que un acceso
    // no autorizado a la DB no permita enviar notificaciones fraudulentas.
    await pool.query(
      `INSERT INTO push_subscriptions (usuario_id,endpoint,p256dh,auth)
       VALUES (?,?,?,?)
       ON DUPLICATE KEY UPDATE p256dh=VALUES(p256dh), auth=VALUES(auth), activo=1`,
      [req.user.id, endpoint, encrypt(p256dh), encrypt(auth)]
    );
    res.status(201).json({ message: 'Suscripción registrada' });
  } catch(err) { next(err); }
}

export async function listarFavoritos(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT fr.*,r.nombre as ruta,p.nombre as parada FROM favoritos_rutas fr
       JOIN rutas r ON r.id=fr.ruta_id
       LEFT JOIN paradas p ON p.id=fr.parada_id
       WHERE fr.usuario_id=?`, [req.user.id]
    );
    res.json(rows);
  } catch(err) { next(err); }
}

export async function agregarFavorito(req, res, next) {
  const { ruta_id, parada_id, alerta_eta } = req.body;
  if (!ruta_id) return res.status(400).json({ error: 'ruta_id es requerido' });
  try {
    await pool.query(
      `INSERT INTO favoritos_rutas (usuario_id,ruta_id,parada_id,alerta_eta) VALUES (?,?,?,?)
       ON DUPLICATE KEY UPDATE parada_id=VALUES(parada_id),alerta_eta=VALUES(alerta_eta)`,
      [req.user.id, ruta_id, parada_id||null, alerta_eta?1:0]
    );
    res.status(201).json({ message: 'Ruta guardada en favoritos' });
  } catch(err) { next(err); }
}

export async function eliminarFavorito(req, res, next) {
  try {
    await pool.query('DELETE FROM favoritos_rutas WHERE usuario_id=? AND ruta_id=?',
      [req.user.id, req.params.ruta_id]);
    res.json({ message: 'Favorito eliminado' });
  } catch(err) { next(err); }
}