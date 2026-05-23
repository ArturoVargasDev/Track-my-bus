import express  from 'express';
import cors     from 'cors';
import morgan   from 'morgan';
import cookieParser from 'cookie-parser';

import { helmetConfig }                        from './middlewares/helmet.middleware.js';
import { doubleCsrfProtection, csrfTokenHandler } from './middlewares/csrf.middleware.js';

import incidenciasRoutes    from './routes/incidencias.routes.js';
import authRoutes           from './routes/auth.routes.js';
import zonasRoutes          from './routes/zonas.routes.js';
import empresasRoutes       from './routes/empresas.routes.js';
import rutasRoutes          from './routes/rutas.routes.js';
import paradasRoutes        from './routes/paradas.routes.js';
import horariosRoutes       from './routes/horarios.routes.js';
import unidadesRoutes       from './routes/unidades.routes.js';
import asignacionesRoutes   from './routes/asignaciones.routes.js';
import gpsRoutes            from './routes/gps.routes.js';
import etaRoutes            from './routes/eta.routes.js';
import boletosRoutes        from './routes/boletos.routes.js';
import mantenimientoRoutes  from './routes/mantenimiento.routes.js';
import analyticsRoutes      from './routes/analytics.routes.js';
import notificacionesRoutes from './routes/notificaciones.routes.js';
import pagosRoutes          from './routes/pagos.routes.js';

const app = express();

app.use(helmetConfig);
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(morgan('dev'));

// Endpoint para obtener token CSRF
app.get('/api/csrf-token', csrfTokenHandler);

// Protección CSRF en todas las rutas POST
app.use(doubleCsrfProtection);

app.use('/api/auth',           authRoutes);
app.use('/api/zonas',          zonasRoutes);
app.use('/api/empresas',       empresasRoutes);
app.use('/api/rutas',          rutasRoutes);
app.use('/api/paradas',        paradasRoutes);
app.use('/api/horarios',       horariosRoutes);
app.use('/api/unidades',       unidadesRoutes);
app.use('/api/asignaciones',   asignacionesRoutes);
app.use('/api/gps',            gpsRoutes);
app.use('/api/eta',            etaRoutes);
app.use('/api/boletos',        boletosRoutes);
app.use('/api/mantenimiento',  mantenimientoRoutes);
app.use('/api/analytics',      analyticsRoutes);
app.use('/api/notificaciones', notificacionesRoutes);
app.use('/api/incidencias',    incidenciasRoutes);
app.use('/api/pagos',          pagosRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Error interno del servidor' });
});

export default app;