/** Backend REAL para las pruebas de navegador: puerto 3100 y una BD nueva en cada ejecución. */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'asistec-e2e-'));
process.env.DB_PATH = path.join(carpeta, 'e2e.db');
process.env.PORT = '3100';
process.env.INTERVALO_ESCALACION_MS = '2000';
require('../../backend/src/server.js');
