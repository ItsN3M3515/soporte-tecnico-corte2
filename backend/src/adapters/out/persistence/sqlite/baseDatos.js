const { DatabaseSync } = require('node:sqlite');

/**
 * Adaptador de infraestructura: abre SQLite y crea el esquema.
 * Usa el módulo SQLite que ya trae Node.js (node:sqlite, Node ≥ 22.13), así no hay
 * que compilar nada al instalar (better-sqlite3 exigía Visual Studio en Windows).
 *  - En ejecución normal usa un archivo (data/soporte.db).
 *  - En las pruebas de integración usa ':memory:' (BD embebida real, el equivalente a H2 en Java).
 */
const ESQUEMA = `
CREATE TABLE IF NOT EXISTS equipos (
  codigo      TEXT PRIMARY KEY,
  descripcion TEXT NOT NULL,
  salon       TEXT NOT NULL,
  edificio    TEXT NOT NULL,
  sede        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tecnicos (
  id                  TEXT PRIMARY KEY,
  nombre              TEXT NOT NULL,
  telefono            TEXT,
  sede                TEXT NOT NULL,
  edificio_base       TEXT NOT NULL,
  estado              TEXT NOT NULL,
  solicitud_actual_id TEXT,
  version             INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS solicitudes (
  id                 TEXT PRIMARY KEY,
  codigo_equipo      TEXT REFERENCES equipos(codigo),   -- NULL en préstamos, eventos, mantenimiento...
  descripcion_equipo TEXT,
  salon              TEXT NOT NULL,
  edificio           TEXT NOT NULL,
  sede               TEXT NOT NULL,
  tipo               TEXT NOT NULL,
  detalle            TEXT,
  datos              TEXT NOT NULL DEFAULT '{}',        -- JSON con lo propio de cada tipo
  clase_en_curso     INTEGER NOT NULL,
  estado             TEXT NOT NULL,
  tecnico_id         TEXT REFERENCES tecnicos(id),
  creada_por         TEXT,
  creada_en          INTEGER NOT NULL,
  programada_para    INTEGER,
  activada_en        INTEGER,
  asignada_en        INTEGER,
  resuelta_en        INTEGER,
  escalada_en        INTEGER,
  motivo_escalacion  TEXT
);
CREATE INDEX IF NOT EXISTS idx_solicitudes_estado_sede ON solicitudes(estado, sede);
CREATE INDEX IF NOT EXISTS idx_solicitudes_creada ON solicitudes(creada_en);
CREATE INDEX IF NOT EXISTS idx_solicitudes_creador ON solicitudes(creada_por, creada_en);

CREATE TABLE IF NOT EXISTS usuarios (
  usuario    TEXT PRIMARY KEY,
  nombre     TEXT NOT NULL,
  rol        TEXT NOT NULL,
  sede       TEXT,
  tecnico_id TEXT REFERENCES tecnicos(id),
  correo     TEXT,
  hash_clave TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notificaciones (
  id           TEXT PRIMARY KEY,
  usuario      TEXT NOT NULL,
  solicitud_id TEXT,
  tipo         TEXT NOT NULL,
  titulo       TEXT NOT NULL,
  mensaje      TEXT NOT NULL,
  creada_en    INTEGER NOT NULL,
  leida        INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario ON notificaciones(usuario, creada_en);
`;

/**
 * Versión del esquema (PRAGMA user_version). La BD es de demostración: si el archivo
 * viene de una versión anterior (Corte 2 v1, sin las columnas del prototipo), se borra
 * y se vuelve a crear; `sembrar()` recarga los datos de ejemplo al arrancar.
 */
const VERSION_ESQUEMA = 3; // 3: usuario de ejemplo con rol ESTUDIANTE
const TABLAS = ['notificaciones', 'solicitudes', 'usuarios', 'tecnicos', 'equipos'];

function migrar(db) {
  const { user_version: version } = db.prepare('PRAGMA user_version').get();
  if (version >= VERSION_ESQUEMA) return;
  db.exec('PRAGMA foreign_keys = OFF');
  TABLAS.forEach((t) => db.exec(`DROP TABLE IF EXISTS ${t}`));
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(`PRAGMA user_version = ${VERSION_ESQUEMA}`);
}

function abrirBaseDatos(ruta = ':memory:') {
  const db = new DatabaseSync(ruta);
  if (ruta !== ':memory:') db.exec('PRAGMA journal_mode = WAL'); // lecturas concurrentes mientras se escribe
  db.exec('PRAGMA foreign_keys = ON');
  migrar(db);
  db.exec(ESQUEMA);
  return db;
}

module.exports = { abrirBaseDatos, VERSION_ESQUEMA };
