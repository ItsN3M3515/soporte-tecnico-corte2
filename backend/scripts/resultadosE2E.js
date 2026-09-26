/**
 * Lee el último resultado de las pruebas de navegador (Playwright, carpeta e2e/).
 * Ese archivo lo escribe `cd e2e && npm test`; si nunca se han corrido, devuelve null.
 */
const fs = require('node:fs');
const path = require('node:path');

const ARCHIVO = path.join(__dirname, '..', '..', 'e2e', 'resultados', 'ultimo.json');

function aplanar(suite, archivo, salida) {
  const actual = suite.file ?? archivo;
  (suite.specs ?? []).forEach((spec) => {
    const resultados = spec.tests.flatMap((t) => t.results);
    const ultimo = resultados[resultados.length - 1];
    salida.push({ archivo: actual, titulo: spec.title, paso: spec.ok, ms: ultimo?.duration ?? 0 });
  });
  (suite.suites ?? []).forEach((s) => aplanar(s, actual, salida));
  return salida;
}

function leerE2E() {
  if (!fs.existsSync(ARCHIVO)) return null;
  const json = JSON.parse(fs.readFileSync(ARCHIVO, 'utf8'));
  const pruebas = json.suites.flatMap((s) => aplanar(s, s.file, []));
  return { fecha: json.stats?.startTime?.slice(0, 10) ?? '', pruebas };
}

/** Busca la prueba E2E por archivo (relativo a e2e/, p. ej. "pruebas/qr.spec.js") y trozo del título. */
function buscarE2E(e2e, archivo, trozo) {
  if (!e2e) return null;
  const nombre = path.basename(archivo);
  return e2e.pruebas.find((p) => path.basename(p.archivo) === nombre && p.titulo.includes(trozo)) ?? null;
}

module.exports = { leerE2E, buscarE2E };
