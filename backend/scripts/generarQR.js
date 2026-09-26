/**
 * Genera las imágenes QR de todos los equipos de demostración en ../docs/qr/
 * para imprimirlas o mostrarlas en pantalla y escanearlas con la app.
 * Uso: npm run qr
 */
const fs = require('node:fs');
const path = require('node:path');
const { generarEquipos } = require('../src/config/datosIniciales');
const { CodigoQR } = require('../src/domain/modelo/CodigoQR');
const { imagenQR } = require('../src/config/imagenQR');

/** Hoja de stickers: un QR por equipo con su ubicación, lista para imprimir en carta (Ctrl+P). */
function hojaParaImprimir(equipos) {
  const salon = (e) => (/^\d/.test(e.salon) ? `Salón ${e.salon}` : e.salon);
  const tarjetas = equipos
    .map((e) => `<figure><img src="${e.codigo}.png" alt="QR ${e.codigo}"><figcaption><b>${e.descripcion}</b><span>${salon(e)} · ${e.edificio}</span><code>${e.codigo}</code><small>Escanéalo con AsisTec para pedir soporte</small></figcaption></figure>`)
    .join('\n');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>AsisTec · QR de los equipos</title>
<style>
  body{font-family:Inter,Arial,sans-serif;margin:24px;color:#0D1638}
  h1{font-size:20px;margin:0 0 4px} p{margin:0 0 16px;color:#848FB3;font-size:13px}
  main{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px}
  figure{margin:0;border:1.5px dashed #BEC4E0;border-radius:14px;padding:10px;text-align:center;break-inside:avoid}
  img{width:150px;height:150px}
  figcaption{display:flex;flex-direction:column;gap:2px;font-size:12px}
  span{color:#2E3192} code{font-size:10px;color:#848FB3} small{font-size:9.5px;color:#F0AC4E;font-weight:bold}
  @media print{body{margin:8mm} p{display:none}}
</style></head><body>
<h1>AsisTec · QR de los equipos (${equipos.length})</h1>
<p>Impriman esta hoja (Ctrl+P) y peguen cada QR en su equipo, o ábranla en el computador y escaneen desde el celular con la app.</p>
<main>
${tarjetas}
</main></body></html>
`;
}

async function main() {
  const destino = path.join(__dirname, '..', '..', 'docs', 'qr');
  fs.mkdirSync(destino, { recursive: true });
  const equipos = generarEquipos();
  const filas = ['| Equipo | Sede | Edificio | Salón | Texto del QR |', '|---|---|---|---|---|'];
  for (const e of equipos) {
    const texto = CodigoQR.generarTexto(e.codigo);
    // El nombre sale de los datos de demostración (código validado por CodigoQR), no de un usuario.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    fs.writeFileSync(path.join(destino, `${e.codigo}.png`), await imagenQR(e.codigo));
    filas.push(`| ${e.descripcion} | ${e.sede} | ${e.edificio} | ${e.salon} | \`${texto}\` |`);
  }
  fs.writeFileSync(path.join(destino, 'README.md'), `# Códigos QR de demostración\n\nPara imprimirlos como stickers (o mostrarlos en pantalla y escanearlos con el celular) abran [imprimir.html](imprimir.html).\n\n${filas.join('\n')}\n`);
  fs.writeFileSync(path.join(destino, 'imprimir.html'), hojaParaImprimir(equipos));
  console.log(`${equipos.length} QR generados en docs/qr/`);
}

main();
