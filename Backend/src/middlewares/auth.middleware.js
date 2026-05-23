import jwt  from 'jsonwebtoken';
import pool from '../config/db.js';

export async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ error: 'Token no proporcionado' });

  const token = header.split(' ')[1];
  try {
    jwt.verify(token, process.env.JWT_SECRET);

    const [rows] = await pool.query(
      `SELECT s.id, u.id as usuario_id, u.rol_id, u.activo
       FROM sesiones s JOIN usuarios u ON u.id = s.usuario_id
       WHERE s.token = ? AND s.expira_at > NOW()`,
      [token]
    );
    if (!rows.length || !rows[0].activo)
      return res.status(401).json({ error: 'Sesión inválida o expirada' });

    req.user = { id: rows[0].usuario_id, rol_id: rows[0].rol_id };
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

// authorize('admin','operador')
export function authorize(...roles) {
  const ROLES = { admin: 1, operador: 2, conductor: 3, usuario: 4 };
  return (req, res, next) => {
    const allowed = roles.map(r => ROLES[r]).filter(Boolean);
    if (!allowed.includes(req.user.rol_id))
      return res.status(403).json({ error: 'No tienes permiso para esta acción' });
    next();
  };
}