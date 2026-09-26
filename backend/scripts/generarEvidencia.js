/* eslint-disable security/detect-non-literal-fs-filename, security/detect-object-injection, security/detect-non-literal-regexp -- script de desarrollo: solo lee archivos fijos del repositorio (pruebas y docs), no datos de usuarios */
/**
 * Genera la evidencia de pruebas para la entrega:
 *   docs/evidencias/resultados-pruebas.md   → todas las pruebas con su resultado y la cobertura
 *   docs/evidencias/evidencia-por-reto.md   → por cada reto: la prueba que lo demuestra (código + resultado)
 *
 * Uso (desde backend/):  npm run evidencia
 * Corre Jest una sola vez con --json y arma los dos documentos a partir de ese resultado,
 * así lo que dice la evidencia es exactamente lo que pasó en esa ejecución.
 */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const RAIZ = path.join(__dirname, '..');
const DOCS = path.join(RAIZ, '..', 'docs', 'evidencias');
const JEST = [process.execPath, ['--disable-warning=ExperimentalWarning', path.join(RAIZ, 'node_modules', 'jest', 'bin', 'jest.js')]];

function correrJest(args) {
  try {
    return execFileSync(JEST[0], [...JEST[1], ...args], { cwd: RAIZ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
  } catch (e) {
    return `${e.stdout ?? ''}${e.stderr ?? ''}`;
  }
}

// ---------- 1. Ejecutar todo una vez ----------
const archivoJson = path.join(RAIZ, 'coverage', 'resultado-jest.json');
fs.mkdirSync(path.dirname(archivoJson), { recursive: true });
correrJest(['--json', `--outputFile=${archivoJson}`, '--silent']);
const resultado = JSON.parse(fs.readFileSync(archivoJson, 'utf8'));
const coberturaUnitaria = correrJest(['tests/unit', '--coverage', '--coverageReporters=text', '--silent']);

const relativo = (f) => path.relative(RAIZ, f).split(path.sep).join('/');
const pruebas = resultado.testResults.flatMap((suite) =>
  suite.assertionResults.map((a) => ({ archivo: relativo(suite.name), nombre: a.fullName, titulo: a.title, estado: a.status, ms: a.duration ?? 0 })),
);
const icono = (estado) => (estado === 'passed' ? '✅' : '❌');

// ---------- 2. resultados-pruebas.md ----------
function resultadosMd() {
  const lineas = [
    '# Evidencia de ejecución de pruebas',
    '',
    `Generado con \`npm run evidencia\` (Jest \`--json\`) · **${resultado.numPassedTests} de ${resultado.numTotalTests} pruebas pasan** · ${resultado.numTotalTestSuites} archivos · ${new Date(resultado.startTime).toISOString().slice(0, 10)}.`,
    '',
    'Versión navegable: [reporte-pruebas.html](reporte-pruebas.html) (se genera con `npm run test:reporte`). Evidencia organizada por reto: [evidencia-por-reto.md](evidencia-por-reto.md).',
    '',
  ];
  const porArchivo = new Map();
  pruebas.forEach((p) => {
    if (!porArchivo.has(p.archivo)) porArchivo.set(p.archivo, []);
    porArchivo.get(p.archivo).push(p);
  });
  [...porArchivo.keys()].sort().forEach((archivo) => {
    const lista = porArchivo.get(archivo);
    const total = lista.reduce((a, p) => a + p.ms, 0) / 1000;
    lineas.push('', `## \`${archivo}\` — ${lista.length} pruebas, ${total.toFixed(1)} s`, '');
    lista.forEach((p) => lineas.push(`- ${icono(p.estado)} ${p.nombre}`));
  });
  const tabla = coberturaUnitaria.split('\n').filter((l) => l.includes('|') || l.startsWith('---'));
  lineas.push('', '## Cobertura de las pruebas unitarias (dominio + aplicación)', '', '```', ...tabla, '```', '');
  return lineas.join('\n');
}

// ---------- 3. evidencia-por-reto.md ----------
/** Extrae el bloque test(...) completo del archivo, a partir de un trozo único de su título. */
function codigoDe(archivo, trozo) {
  const lineas = fs.readFileSync(path.join(RAIZ, archivo), 'utf8').split('\n');
  const i = lineas.findIndex((l) => l.includes(trozo) && /\btest(\.each)?/.test(l));
  const j = i >= 0 ? i : lineas.findIndex((l) => l.includes(trozo));
  if (j < 0) throw new Error(`No encontré "${trozo}" en ${archivo}`);
  let inicio = j;
  while (!/^\s*test(\.each)?[(\s]/.test(lineas[inicio]) && inicio > 0) inicio -= 1;
  const sangria = /^\s*/.exec(lineas[inicio])[0];
  let fin = inicio;
  while (fin < lineas.length && !new RegExp(`^${sangria}}\\)?(, \\d+)?\\);\\s*$`).test(lineas[fin])) fin += 1;
  return lineas
    .slice(inicio, fin + 1)
    .map((l) => l.slice(sangria.length))
    .join('\n');
}

function ejecucion(archivo, trozo) {
  const casos = pruebas.filter((p) => p.archivo === archivo && p.titulo.includes(trozo));
  if (casos.length === 0) throw new Error(`Sin resultado para "${trozo}" en ${archivo}`);
  const pasan = casos.filter((p) => p.estado === 'passed').length;
  return [...casos.map((p) => `  ${p.estado === 'passed' ? '✓' : '✕'} ${p.titulo} (${p.ms} ms)`), '', `Tests: ${pasan} passed, ${casos.length} total`].join('\n');
}

const RETOS = require('./retos-evidencia');
const { leerE2E, buscarE2E } = require('./resultadosE2E');

const e2e = leerE2E();

function seccionE2E(r) {
  if (!r.e2e) return [];
  const l = ['', '### En la app, de punta a punta (navegador real con Playwright) — `e2e/`', ''];
  l.push('Estas pruebas abren la app web en Chromium, inician sesión y hacen lo mismo que haría una persona. La cámara es un video falso con el QR impreso, así que la lectura del QR es real.');
  r.e2e.forEach((p) => {
    const hecho = buscarE2E(e2e, p.archivo, p.test);
    l.push('', '```js', codigoDe(`../e2e/${p.archivo}`, p.test), '```', '');
    l.push(`Ejecución: \`cd e2e && npx playwright test ${p.archivo} -g "${p.test}"\``, '', '```');
    l.push(hecho ? `  ${hecho.paso ? '✓' : '✕'} ${hecho.titulo} (${hecho.ms} ms)` : '  (aún no se ha corrido: cd e2e && npm test)', '```');
  });
  return l;
}

function evidenciaMd() {
  const ancla = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 -]/g, '').trim().replace(/\s+/g, '-');
  const l = [
    '# Evidencia de pruebas por reto',
    '',
    'Para cada reto: qué exige, la decisión que lo atiende y **la prueba que lo demuestra**, con su código y el resultado de ejecutarla. Generado con `npm run evidencia` a partir de una sola ejecución de Jest; cualquiera de los comandos se puede correr en vivo desde `backend/`.',
    '',
    'Para verlo como lista de chequeo en la terminal: `npm run retos`.',
    '',
    '| Reto | Pruebas Jest | Pruebas en navegador |',
    '|---|---|---|',
    ...RETOS.map((r, i) => `| [${i + 1}. ${r.reto}](#${ancla(`${i + 1}. ${r.reto}`)}) | ${r.pruebas.length} | ${r.e2e?.length ?? '—'} |`),
  ];
  RETOS.forEach((r, i) => {
    const item = r.item ? `**Reto ${r.item} de la lista del profesor.**  ` : '**Reto adicional del prototipo.**  ';
    l.push('', `## ${i + 1}. ${r.reto}`, '', item, `**Qué exige:** ${r.exige}  `, `**Atributo de calidad:** ${r.atributo}  `, `**Decisión:** ${r.decision}`);
    r.pruebas.forEach((p) => {
      l.push('', `### ${p.tipo} — \`${p.archivo}\``, '', '```js', codigoDe(p.archivo, p.test), '```', '');
      l.push(`Ejecución: \`npx jest ${p.archivo} -t "${p.resultado ?? p.test}"\``, '', '```', ejecucion(p.archivo, p.resultado ?? p.test), '```');
    });
    l.push(...seccionE2E(r));
  });
  l.push('');
  return l.join('\n');
}

fs.writeFileSync(path.join(DOCS, 'resultados-pruebas.md'), resultadosMd());
fs.writeFileSync(path.join(DOCS, 'evidencia-por-reto.md'), evidenciaMd());
console.log(`Evidencia generada: ${resultado.numPassedTests}/${resultado.numTotalTests} pruebas pasan.`);
if (!resultado.success) process.exitCode = 1;
