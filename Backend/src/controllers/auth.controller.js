// src/controllers/auth.controller.js

import { encrypt, decrypt } from '../utils/crypto.js';
import bcrypt from 'bcrypt';
import jwt    from 'jsonwebtoken';
import pool   from '../config/db.js';
import { setSessionCookie, clearSessionCookie } from '../utils/cookie.utils.js';

const SALT = 12;

export async function registro(req, res, next) {
  const { nombre, apellidos, email, telefono, password, es_estudiante } = req.body;
  if (!nombre || !email || !password)
    return res.status(400).json({ error: 'nombre, email y password son requeridos' });
  try {
    const [existe] = await pool.query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existe.length) return res.status(409).json({ error: 'Email ya registrado' });
    const hash = await bcrypt.hash(password, SALT);
    const [r] = await pool.query(
      `INSERT INTO usuarios (rol_id,nombre,apellidos,email,telefono,password_hash,es_estudiante)
       VALUES (4,?,?,?,?,?,?)`,
      [nombre, apellidos||null, email, telefono||null, hash, es_estudiante?1:0]
    );
    res.status(201).json({ message: 'Usuario registrado', id: r.insertId });
  } catch(err) { next(err); }
}

export async function login(req, res, next) {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'email y password son requeridos' });
  try {
    const [rows] = await pool.query(
      `SELECT u.id,u.nombre,u.apellidos,u.email,u.password_hash,
              u.rol_id,r.nombre as rol,u.activo,u.es_estudiante,
              u.credencial_valida,u.foto_url
       FROM usuarios u JOIN roles r ON r.id=u.rol_id WHERE u.email=?`,
      [email]
    );
    if (!rows.length) return res.status(401).json({ error: 'Credenciales invalidas' });
    const user = rows[0];
    if (!user.activo) return res.status(403).json({ error: 'Cuenta desactivada' });
    if (!await bcrypt.compare(password, user.password_hash))
      return res.status(401).json({ error: 'Credenciales invalidas' });
    const token = jwt.sign(
      { id: user.id, rol_id: user.rol_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    const expira = new Date();
    expira.setDate(expira.getDate() + 7);
    await pool.query('INSERT INTO sesiones (usuario_id,token,expira_at) VALUES (?,?,?)',
      [user.id, token, expira]);
    setSessionCookie(res, token);
    const { password_hash, ...userData } = user;
    res.json({ usuario: userData });
  } catch(err) { next(err); }
}

export async function logout(req, res, next) {
  const token = req.cookies?.session_token;
  if (!token) return res.status(400).json({ error: 'Token no proporcionado' });
  try {
    await pool.query('DELETE FROM sesiones WHERE token = ?', [token]);
    clearSessionCookie(res);
    res.json({ message: 'Sesion cerrada' });
  } catch(err) { next(err); }
}

export async function listarEstudiantes(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT id, nombre, apellidos, email, telefono, es_estudiante, credencial_valida
       FROM usuarios WHERE es_estudiante = 1 ORDER BY credencial_valida, nombre`
    );
    res.json(rows);
  } catch(err) { next(err); }
}

export async function me(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT u.id,u.nombre,u.apellidos,u.email,u.telefono,
       u.foto_url,u.credencial_url,u.es_estudiante,u.credencial_valida,r.nombre as rol
       FROM usuarios u JOIN roles r ON r.id=u.rol_id WHERE u.id=?`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (rows[0].credencial_url) rows[0].credencial_url = decrypt(rows[0].credencial_url);
    res.json(rows[0]);
  } catch(err) { next(err); }
}

export async function subirCredencial(req, res, next) {
  const { credencial_url } = req.body;
  if (!credencial_url) return res.status(400).json({ error: 'credencial_url es requerida' });
  try {
    await pool.query(
      'UPDATE usuarios SET credencial_url=?, credencial_valida=FALSE WHERE id=?',
      [encrypt(credencial_url), req.user.id]
    );
    res.json({ message: 'Credencial enviada, pendiente de validacion' });
  } catch(err) { next(err); }
}

export async function validarCredencial(req, res, next) {
  const { valida } = req.body;
  try {
    await pool.query('UPDATE usuarios SET credencial_valida=? WHERE id=?',
      [valida?1:0, req.params.id]);
    res.json({ message: `Credencial ${valida ? 'aprobada' : 'rechazada'}` });
  } catch(err) { next(err); }
}

export async function listarUsuarios(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.nombre, u.apellidos, u.email, u.telefono, u.activo,
              u.es_estudiante, u.rol_id, r.nombre as rol
       FROM usuarios u JOIN roles r ON r.id = u.rol_id
       ORDER BY u.rol_id, u.nombre`
    );
    res.json(rows);
  } catch(err) { next(err); }
}

export async function crearUsuario(req, res, next) {
  const { nombre, apellidos, email, telefono, password, rol_id } = req.body;
  if (!nombre || !email || !password || !rol_id)
    return res.status(400).json({ error: 'nombre, email, password y rol_id son requeridos' });
  try {
    const [existe] = await pool.query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existe.length) return res.status(409).json({ error: 'Email ya registrado' });
    const hash = await bcrypt.hash(password, SALT);
    const [r] = await pool.query(
      `INSERT INTO usuarios (rol_id, nombre, apellidos, email, telefono, password_hash)
       VALUES (?,?,?,?,?,?)`,
      [rol_id, nombre, apellidos||null, email, telefono||null, hash]
    );
    res.status(201).json({ id: r.insertId, message: 'Usuario creado' });
  } catch(err) { next(err); }
}

export async function actualizarUsuario(req, res, next) {
  if (req.user.rol_id !== 1 && req.user.id !== Number(req.params.id))
    return res.status(403).json({ error: 'No tienes permiso para editar este usuario' });

  const { nombre, apellidos, email, telefono, foto_url } = req.body;
  if (!nombre || !email)
    return res.status(400).json({ error: 'nombre y email son requeridos' });
  try {
    const [existe] = await pool.query(
      'SELECT id FROM usuarios WHERE email = ? AND id != ?', [email, req.params.id]
    );
    if (existe.length) return res.status(409).json({ error: 'Email ya registrado por otro usuario' });
    await pool.query(
      'UPDATE usuarios SET nombre=?, apellidos=?, email=?, telefono=?, foto_url=? WHERE id=?',
      [nombre, apellidos||null, email, telefono||null, foto_url||null, req.params.id]
    );
    res.json({ message: 'Usuario actualizado' });
  } catch(err) { next(err); }
}

export async function cambiarPassword(req, res, next) {
  const { password_actual, password_nueva } = req.body;
  if (!password_actual || !password_nueva)
    return res.status(400).json({ error: 'password_actual y password_nueva son requeridos' });
  if (password_nueva.length < 8)
    return res.status(400).json({ error: 'La contrasena debe tener al menos 8 caracteres' });
  try {
    const [rows] = await pool.query('SELECT password_hash FROM usuarios WHERE id = ?', [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    const valida = await bcrypt.compare(password_actual, rows[0].password_hash);
    if (!valida) return res.status(401).json({ error: 'La contrasena actual es incorrecta' });
    const hash = await bcrypt.hash(password_nueva, SALT);
    await pool.query('UPDATE usuarios SET password_hash = ? WHERE id = ?', [hash, req.user.id]);
    res.json({ message: 'Contrasena actualizada correctamente' });
  } catch(err) { next(err); }
}

export async function cambiarRol(req, res, next) {
  const { rol_id } = req.body;
  try {
    await pool.query('UPDATE usuarios SET rol_id = ? WHERE id = ?', [rol_id, req.params.id]);
    res.json({ message: 'Rol actualizado' });
  } catch(err) { next(err); }
}

export async function toggleActivo(req, res, next) {
  const { activo } = req.body;
  try {
    await pool.query('UPDATE usuarios SET activo = ? WHERE id = ?', [activo?1:0, req.params.id]);
    res.json({ message: `Usuario ${activo ? 'activado' : 'desactivado'}` });
  } catch(err) { next(err); }
}
