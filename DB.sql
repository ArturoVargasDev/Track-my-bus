-- ============================================================
--  TRACK MY BUS — Base de datos completa
--  Motor: MySQL 8.0+
--  Charset: utf8mb4
-- ============================================================

CREATE DATABASE IF NOT EXISTS track_my_bus
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE track_my_bus;

-- ============================================================
-- 1. ROLES Y USUARIOS
-- ============================================================

CREATE TABLE roles (
  id          TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(50) NOT NULL UNIQUE,
  descripcion VARCHAR(255)
);

CREATE TABLE usuarios (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  rol_id            TINYINT UNSIGNED NOT NULL,
  nombre            VARCHAR(100) NOT NULL,
  apellidos         VARCHAR(100),
  email             VARCHAR(150) NOT NULL UNIQUE,
  telefono          VARCHAR(20),
  password_hash     VARCHAR(255) NOT NULL,
  foto_url          VARCHAR(500),
  es_estudiante     BOOLEAN NOT NULL DEFAULT FALSE,
  credencial_url    VARCHAR(500),
  credencial_valida BOOLEAN NOT NULL DEFAULT FALSE,
  activo            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_usuarios_rol FOREIGN KEY (rol_id) REFERENCES roles(id)
);

CREATE TABLE sesiones (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id  BIGINT UNSIGNED NOT NULL,
  token       VARCHAR(500) NOT NULL UNIQUE,
  dispositivo VARCHAR(200),
  ip          VARCHAR(45),
  expira_at   DATETIME NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sesiones_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- ============================================================
-- 2. EMPRESAS OPERADORAS
-- ============================================================

CREATE TABLE empresas (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(150) NOT NULL,
  rfc         VARCHAR(20),
  telefono    VARCHAR(20),
  email       VARCHAR(150),
  logo_url    VARCHAR(500),
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE operadores_empresas (
  usuario_id  BIGINT UNSIGNED NOT NULL,
  empresa_id  INT UNSIGNED NOT NULL,
  cargo       VARCHAR(100),
  PRIMARY KEY (usuario_id, empresa_id),
  CONSTRAINT fk_ope_usuario  FOREIGN KEY (usuario_id)  REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_ope_empresa  FOREIGN KEY (empresa_id)  REFERENCES empresas(id) ON DELETE CASCADE
);

-- ============================================================
-- 3. ZONAS CONURBADAS Y RUTAS
-- ============================================================

CREATE TABLE zonas (
  id          SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL,
  descripcion VARCHAR(255)
);

CREATE TABLE rutas (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  empresa_id      INT UNSIGNED NOT NULL,
  zona_id         SMALLINT UNSIGNED NOT NULL,
  nombre          VARCHAR(150) NOT NULL,
  clave           VARCHAR(30),
  tipo            ENUM('urbana','suburbana','foranea') NOT NULL DEFAULT 'urbana',
  color_hex       CHAR(7) DEFAULT '#2563EB',
  accesible       BOOLEAN NOT NULL DEFAULT FALSE,
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  precio          DECIMAL(8,2) NOT NULL DEFAULT 0.00,  -- precio del boleto
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rutas_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id),
  CONSTRAINT fk_rutas_zona    FOREIGN KEY (zona_id)    REFERENCES zonas(id)
);

CREATE TABLE ruta_polyline (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ruta_id     INT UNSIGNED NOT NULL,
  orden       SMALLINT UNSIGNED NOT NULL,
  latitud     DECIMAL(10,7) NOT NULL,
  longitud    DECIMAL(10,7) NOT NULL,
  CONSTRAINT fk_polyline_ruta FOREIGN KEY (ruta_id) REFERENCES rutas(id) ON DELETE CASCADE,
  UNIQUE KEY uq_ruta_orden (ruta_id, orden)
);

CREATE TABLE paradas (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ruta_id     INT UNSIGNED NOT NULL,
  nombre      VARCHAR(150) NOT NULL,
  orden       SMALLINT UNSIGNED NOT NULL,
  latitud     DECIMAL(10,7) NOT NULL,
  longitud    DECIMAL(10,7) NOT NULL,
  es_terminal BOOLEAN NOT NULL DEFAULT FALSE,
  accesible   BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT fk_paradas_ruta FOREIGN KEY (ruta_id) REFERENCES rutas(id) ON DELETE CASCADE,
  UNIQUE KEY uq_parada_orden (ruta_id, orden)
);

CREATE TABLE horarios (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ruta_id         INT UNSIGNED NOT NULL,
  dia_semana      TINYINT UNSIGNED NOT NULL,
  hora_salida     TIME NOT NULL,
  hora_llegada    TIME NOT NULL,
  es_hora_pico    BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT fk_horarios_ruta FOREIGN KEY (ruta_id) REFERENCES rutas(id) ON DELETE CASCADE
);

-- ============================================================
-- 4. UNIDADES (AUTOBUSES)
-- ============================================================

CREATE TABLE unidades (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  empresa_id      INT UNSIGNED NOT NULL,
  numero_economico VARCHAR(30) NOT NULL,
  placa           VARCHAR(20) NOT NULL UNIQUE,
  marca           VARCHAR(80),
  modelo          VARCHAR(80),
  anio            YEAR,
  capacidad       SMALLINT UNSIGNED,
  accesible       BOOLEAN NOT NULL DEFAULT FALSE,
  foto_url        VARCHAR(500),
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_unidades_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id)
);

CREATE TABLE asignaciones (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  unidad_id       INT UNSIGNED NOT NULL,
  conductor_id    BIGINT UNSIGNED NOT NULL,
  ruta_id         INT UNSIGNED NOT NULL,
  inicio          DATETIME NOT NULL,
  fin             DATETIME,
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_asig_unidad    FOREIGN KEY (unidad_id)    REFERENCES unidades(id),
  CONSTRAINT fk_asig_conductor FOREIGN KEY (conductor_id) REFERENCES usuarios(id),
  CONSTRAINT fk_asig_ruta      FOREIGN KEY (ruta_id)      REFERENCES rutas(id)
);

-- ============================================================
-- 5. RASTREO GPS EN TIEMPO REAL
-- ============================================================

CREATE TABLE posicion_actual (
  unidad_id       INT UNSIGNED PRIMARY KEY,
  latitud         DECIMAL(10,7) NOT NULL,
  longitud        DECIMAL(10,7) NOT NULL,
  velocidad_kmh   DECIMAL(5,2) DEFAULT 0,
  rumbo           DECIMAL(5,2),
  conductor_activo BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_posact_unidad FOREIGN KEY (unidad_id) REFERENCES unidades(id) ON DELETE CASCADE
);

CREATE TABLE historial_posiciones (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  unidad_id       INT UNSIGNED NOT NULL,
  asignacion_id   BIGINT UNSIGNED,
  latitud         DECIMAL(10,7) NOT NULL,
  longitud        DECIMAL(10,7) NOT NULL,
  velocidad_kmh   DECIMAL(5,2) DEFAULT 0,
  rumbo           DECIMAL(5,2),
  registrado_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_hist_unidad_tiempo (unidad_id, registrado_at),
  CONSTRAINT fk_hist_unidad     FOREIGN KEY (unidad_id)     REFERENCES unidades(id),
  CONSTRAINT fk_hist_asignacion FOREIGN KEY (asignacion_id) REFERENCES asignaciones(id)
) ROW_FORMAT=COMPRESSED;

CREATE TABLE incidencias (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  unidad_id       INT UNSIGNED,
  ruta_id         INT UNSIGNED,
  reportado_por   BIGINT UNSIGNED NOT NULL,
  tipo            ENUM('accidente','trafico','desvio','averia','otro') NOT NULL,
  descripcion     VARCHAR(500),
  latitud         DECIMAL(10,7),
  longitud        DECIMAL(10,7),
  activa          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resuelta_at     DATETIME,
  CONSTRAINT fk_inci_unidad   FOREIGN KEY (unidad_id)     REFERENCES unidades(id),
  CONSTRAINT fk_inci_ruta     FOREIGN KEY (ruta_id)       REFERENCES rutas(id),
  CONSTRAINT fk_inci_usuario  FOREIGN KEY (reportado_por) REFERENCES usuarios(id)
);

-- ============================================================
-- 6. ETA
-- ============================================================

CREATE TABLE eta_registros (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  unidad_id       INT UNSIGNED NOT NULL,
  parada_id       INT UNSIGNED NOT NULL,
  eta_minutos     DECIMAL(5,1) NOT NULL,
  confianza_min   DECIMAL(4,1),
  confianza_max   DECIMAL(4,1),
  fuente          ENUM('historico','tiempo_real','hibrido') NOT NULL DEFAULT 'hibrido',
  calculado_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_eta_unidad_parada (unidad_id, parada_id),
  CONSTRAINT fk_eta_unidad FOREIGN KEY (unidad_id) REFERENCES unidades(id),
  CONSTRAINT fk_eta_parada FOREIGN KEY (parada_id) REFERENCES paradas(id)
);

CREATE TABLE velocidades_tramo (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ruta_id         INT UNSIGNED NOT NULL,
  punto_origen    SMALLINT UNSIGNED NOT NULL,
  punto_destino   SMALLINT UNSIGNED NOT NULL,
  franja_hora     TINYINT UNSIGNED NOT NULL,
  dia_semana      TINYINT UNSIGNED NOT NULL,
  velocidad_prom  DECIMAL(5,2) NOT NULL,
  muestras        INT UNSIGNED NOT NULL DEFAULT 1,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_tramo (ruta_id, punto_origen, punto_destino, franja_hora, dia_semana),
  CONSTRAINT fk_vt_ruta FOREIGN KEY (ruta_id) REFERENCES rutas(id)
);

-- ============================================================
-- 7. BOLETOS ESTUDIANTILES (QR)
-- ============================================================

CREATE TABLE boletos (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id      BIGINT UNSIGNED NOT NULL,
  ruta_id         INT UNSIGNED NOT NULL,
  qr_token        VARCHAR(255) NOT NULL UNIQUE,
  precio          DECIMAL(8,2) NOT NULL,
  estado          ENUM('pagado','usado','expirado','cancelado') NOT NULL DEFAULT 'pagado',
  valido_desde    DATETIME NOT NULL,
  valido_hasta    DATETIME NOT NULL,
  usado_at        DATETIME,
  unidad_id       INT UNSIGNED,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_boleto_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  CONSTRAINT fk_boleto_ruta    FOREIGN KEY (ruta_id)    REFERENCES rutas(id),
  CONSTRAINT fk_boleto_unidad  FOREIGN KEY (unidad_id)  REFERENCES unidades(id)
);

CREATE TABLE pagos (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  boleto_id       BIGINT UNSIGNED NOT NULL,
  usuario_id      BIGINT UNSIGNED NOT NULL,
  monto           DECIMAL(8,2) NOT NULL,
  metodo          ENUM('tarjeta','transferencia','efectivo','otro') NOT NULL,
  referencia      VARCHAR(200),
  estado          ENUM('pendiente','completado','fallido','reembolsado') NOT NULL DEFAULT 'pendiente',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pago_boleto  FOREIGN KEY (boleto_id)  REFERENCES boletos(id),
  CONSTRAINT fk_pago_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- ============================================================
-- 8. MANTENIMIENTO DE UNIDADES
-- ============================================================

CREATE TABLE tipos_mantenimiento (
  id          SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL,
  categoria   ENUM('preventivo','correctivo','revision') NOT NULL,
  descripcion VARCHAR(500),
  intervalo_km INT UNSIGNED,
  intervalo_dias SMALLINT UNSIGNED
);

CREATE TABLE ordenes_mantenimiento (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  unidad_id       INT UNSIGNED NOT NULL,
  tipo_id         SMALLINT UNSIGNED NOT NULL,
  solicitado_por  BIGINT UNSIGNED NOT NULL,
  estado          ENUM('pendiente','en_proceso','completado','cancelado') NOT NULL DEFAULT 'pendiente',
  prioridad       ENUM('baja','media','alta','critica') NOT NULL DEFAULT 'media',
  descripcion     VARCHAR(1000),
  km_actual       INT UNSIGNED,
  fecha_programada DATE,
  fecha_inicio    DATETIME,
  fecha_fin       DATETIME,
  costo           DECIMAL(10,2),
  notas_tecnico   VARCHAR(1000),
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_om_unidad  FOREIGN KEY (unidad_id)      REFERENCES unidades(id),
  CONSTRAINT fk_om_tipo    FOREIGN KEY (tipo_id)        REFERENCES tipos_mantenimiento(id),
  CONSTRAINT fk_om_usuario FOREIGN KEY (solicitado_por) REFERENCES usuarios(id)
);

CREATE TABLE bitacora_km (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  unidad_id   INT UNSIGNED NOT NULL,
  km_lectura  INT UNSIGNED NOT NULL,
  registrado_por BIGINT UNSIGNED NOT NULL,
  registrado_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bkm_unidad  FOREIGN KEY (unidad_id)      REFERENCES unidades(id),
  CONSTRAINT fk_bkm_usuario FOREIGN KEY (registrado_por) REFERENCES usuarios(id)
);

-- ============================================================
-- 9. ANALYTICS OPERATIVOS
-- ============================================================

CREATE TABLE analytics_diarios (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  fecha               DATE NOT NULL,
  ruta_id             INT UNSIGNED NOT NULL,
  unidad_id           INT UNSIGNED NOT NULL,
  viajes_completados  SMALLINT UNSIGNED DEFAULT 0,
  retrasos_total      SMALLINT UNSIGNED DEFAULT 0,
  minutos_retraso     DECIMAL(8,2) DEFAULT 0,
  velocidad_prom_kmh  DECIMAL(5,2),
  pasajeros_estimados SMALLINT UNSIGNED,
  incidencias_total   SMALLINT UNSIGNED DEFAULT 0,
  UNIQUE KEY uq_analytics (fecha, ruta_id, unidad_id),
  CONSTRAINT fk_ana_ruta   FOREIGN KEY (ruta_id)   REFERENCES rutas(id),
  CONSTRAINT fk_ana_unidad FOREIGN KEY (unidad_id) REFERENCES unidades(id)
);

CREATE TABLE demanda_paradas (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  parada_id       INT UNSIGNED NOT NULL,
  dia_semana      TINYINT UNSIGNED NOT NULL,
  franja_hora     TINYINT UNSIGNED NOT NULL,
  abordajes_prom  DECIMAL(6,2) DEFAULT 0,
  muestras        INT UNSIGNED DEFAULT 1,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_demanda (parada_id, dia_semana, franja_hora),
  CONSTRAINT fk_dem_parada FOREIGN KEY (parada_id) REFERENCES paradas(id)
);

-- ============================================================
-- 10. NOTIFICACIONES Y ALERTAS
-- ============================================================

CREATE TABLE notificaciones (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id      BIGINT UNSIGNED NOT NULL,
  tipo            ENUM('eta','incidencia','boleto','mantenimiento','sistema') NOT NULL,
  titulo          VARCHAR(200) NOT NULL,
  cuerpo          VARCHAR(1000),
  leida           BOOLEAN NOT NULL DEFAULT FALSE,
  datos_extra     JSON,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_noti_usuario (usuario_id, leida),
  CONSTRAINT fk_noti_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE push_subscriptions (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id      BIGINT UNSIGNED NOT NULL,
  endpoint        VARCHAR(1000) NOT NULL,
  p256dh          VARCHAR(500) NOT NULL,
  auth            VARCHAR(200) NOT NULL,
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_push_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE favoritos_rutas (
  usuario_id  BIGINT UNSIGNED NOT NULL,
  ruta_id     INT UNSIGNED NOT NULL,
  parada_id   INT UNSIGNED,
  alerta_eta  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (usuario_id, ruta_id),
  CONSTRAINT fk_fav_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_fav_ruta    FOREIGN KEY (ruta_id)    REFERENCES rutas(id) ON DELETE CASCADE,
  CONSTRAINT fk_fav_parada  FOREIGN KEY (parada_id)  REFERENCES paradas(id)
);

-- ============================================================
-- DATOS SEMILLA (seed)
-- ============================================================

INSERT INTO roles (nombre, descripcion) VALUES
  ('admin',     'Administrador del sistema con acceso total'),
  ('operador',  'Gestor de empresa de transporte'),
  ('conductor', 'Operador de unidad de transporte'),
  ('usuario',   'Pasajero/usuario final de la app');

INSERT INTO zonas (nombre, descripcion) VALUES
  ('Colima–Villa de Álvarez', 'Zona conurbada principal del piloto');

INSERT INTO tipos_mantenimiento (nombre, categoria, intervalo_km, intervalo_dias) VALUES
  ('Cambio de aceite',               'preventivo',  5000,  90),
  ('Revisión de frenos',             'preventivo', 10000, 180),
  ('Cambio de filtro de aire',       'preventivo', 15000, 180),
  ('Revisión de llantas',            'preventivo',  5000,  60),
  ('Servicio general',               'preventivo', 20000, 365),
  ('Reparación de motor',            'correctivo',  NULL, NULL),
  ('Reparación de sistema eléctrico','correctivo',  NULL, NULL),
  ('Revisión pre-turno',             'revision',    NULL,    1);

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================