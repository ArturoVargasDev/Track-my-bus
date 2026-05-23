import { body, validationResult } from 'express-validator';

// Middleware que retorna error si hay fallas de validación
export function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(422).json({ errors: errors.array() });
  next();
}

// Reglas para registro
export const registroRules = [
  body('nombre').trim().notEmpty().escape().withMessage('nombre requerido'),
  body('apellidos').optional().trim().escape(),
  body('email').isEmail().normalizeEmail().withMessage('email inválido'),
  body('telefono').optional().trim().isMobilePhone().withMessage('teléfono inválido'),
  body('password').isLength({ min: 8 }).withMessage('password mínimo 8 caracteres'),
  body('es_estudiante').optional().isBoolean(),
];

// Reglas para login
export const loginRules = [
  body('email').isEmail().normalizeEmail().withMessage('email inválido'),
  body('password').notEmpty().withMessage('password requerido'),
];

// Reglas para boletos
export const boletoRules = [
  body('ruta_id').isInt({ min: 1 }).withMessage('ruta_id inválido'),
  body('cantidad').optional().isInt({ min: 1, max: 10 }),
];

// Reglas para incidencias
export const incidenciaRules = [
  body('tipo').trim().notEmpty().escape().withMessage('tipo requerido'),
  body('descripcion').trim().notEmpty().escape().isLength({ max: 1000 }),
  body('unidad_id').optional().isInt({ min: 1 }),
];