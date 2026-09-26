/**
 * Lista de chequeo de los retos para la sustentación.
 *
 * Uso (desde backend/):  npm run retos
 * Corre TODAS las pruebas de Jest una vez y, por cada reto de la lista del profesor, muestra
 * las pruebas que lo demuestran con ✓ o ✕. Si ya se corrieron las pruebas de navegador
 * (cd e2e && npm test), también muestra su último resultado.
 */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const RETOS = require('./retos-evidencia');
const { leerE2E, buscarE2E } = require('./resultadosE2E');

const RAIZ = path.join(__dirname, '..');
const salida = path.join(RAIZ, 'coverage', 'resultado-retos.json');
fs.mkdirSync(path.dirname(salida), { recursive: true });

process.stdout.write('Corriendo todas las pruebas de Jest...\n');
try {
  execFileSync(process.execPath, ['--disable-warning=ExperimentalWarning', path.join(RAIZ, 'node_modules', 'jest', 'bin', 'jest.js'), '--json', `--outputFile=${salida}`, '--silent'], {
    cwd: RAIZ,
    stdio: 'ignore',
  });
} catch {
  // Si alguna falla, Jest sale con código 1 pero el JSON queda escrito; abajo se marca con ✕.
}
const resultado = JSON.parse(fs.readFileSync(salida, 'utf8'));
const pruebas = resultado.testResults.flatMap((suite) =>
  suite.assertionResults.map((a) => ({ archivo: path.relative(RAIZ, suite.name).split(path.sep).join('/'), titulo: a.title, paso: a.status === 'passed' })),
);
const e2e = leerE2E();

const VERDE = '\x1b[32m';
const ROJO = '\x1b[31m';
const GRIS = '\x1b[90m';
const NEGRITA = '\x1b[1m';
const FIN = '\x1b[0m';
const marca = (paso) => (paso ? `${VERDE}✓${FIN}` : `${ROJO}✕${FIN}`);

let fallas = 0;
const lineas = ['', `${NEGRITA}RETOS DEL CORTE 2 · pruebas que los demuestran${FIN}`, ''];
RETOS.forEach((r) => {
  const titulo = r.item ? `Reto ${r.item} · ${r.reto}` : `Adicional · ${r.reto}`;
  const casos = r.pruebas.map((p) => {
    const trozo = p.resultado ?? p.test;
    const encontradas = pruebas.filter((x) => x.archivo === p.archivo && x.titulo.includes(trozo));
    const paso = encontradas.length > 0 && encontradas.every((x) => x.paso);
    return { paso, texto: `${p.tipo}: "${encontradas[0]?.titulo ?? trozo}"`, donde: p.archivo };
  });
  const navegador = (r.e2e ?? []).map((p) => {
    const hecho = buscarE2E(e2e, p.archivo, p.test);
    return { paso: hecho?.paso, texto: `Navegador (Playwright): "${hecho?.titulo ?? p.test}"`, donde: `e2e/${p.archivo}`, pendiente: !hecho };
  });
  const todos = [...casos, ...navegador.filter((n) => !n.pendiente)];
  const ok = todos.every((c) => c.paso);
  if (!ok) fallas += 1;
  lineas.push(`${ok ? `${VERDE}[✓]${FIN}` : `${ROJO}[✕]${FIN}`} ${NEGRITA}${titulo}${FIN}`);
  [...casos, ...navegador].forEach((c) => {
    const icono = c.pendiente ? `${GRIS}·${FIN}` : marca(c.paso);
    lineas.push(`     ${icono} ${c.texto}`, `       ${GRIS}${c.donde}${c.pendiente ? ' (sin correr: cd e2e && npm test)' : ''}${FIN}`);
  });
  lineas.push('');
});
lineas.push(`Jest: ${resultado.numPassedTests} de ${resultado.numTotalTests} pruebas pasan.`);
lineas.push(e2e ? `Navegador (Playwright, ${e2e.fecha}): ${e2e.pruebas.filter((p) => p.paso).length} de ${e2e.pruebas.length} pasan.` : 'Navegador (Playwright): aún no se han corrido (cd e2e && npm install && npm run preparar && npm test).');
lineas.push(fallas === 0 ? `${VERDE}${NEGRITA}Todos los retos quedan demostrados.${FIN}` : `${ROJO}${NEGRITA}${fallas} reto(s) con pruebas que fallan.${FIN}`, '');
process.stdout.write(lineas.join('\n'));
if (fallas > 0 || !resultado.success) process.exitCode = 1;
