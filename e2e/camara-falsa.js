/**
 * "Cámara" para las pruebas: convierte el PNG de un QR impreso (docs/qr) en un video .y4m que
 * Chromium usa como si fuera la webcam (--use-file-for-fake-video-capture). Así la prueba no
 * escribe el texto del QR: la app lo LEE de la imagen de la cámara, como pasaría con un celular.
 */
const fs = require('node:fs');
const path = require('node:path');
const { PNG } = require('pngjs');

const ANCHO = 640;
const ALTO = 480;
const LADO_QR = 300;
const CUADROS = 10;

function crearVideoDeQr(codigoEquipo, destino) {
  const png = PNG.sync.read(fs.readFileSync(path.join(__dirname, '..', 'docs', 'qr', `${codigoEquipo}.png`)));
  const Y = Buffer.alloc(ANCHO * ALTO, 200); // fondo gris claro, como la pared del salón
  const x0 = (ANCHO - LADO_QR) / 2;
  const y0 = (ALTO - LADO_QR) / 2;
  for (let y = 0; y < LADO_QR; y += 1) {
    for (let x = 0; x < LADO_QR; x += 1) {
      const sx = Math.floor((x * png.width) / LADO_QR);
      const sy = Math.floor((y * png.height) / LADO_QR);
      const i = (sy * png.width + sx) * 4;
      Y[(y0 + y) * ANCHO + x0 + x] = Math.round(0.299 * png.data[i] + 0.587 * png.data[i + 1] + 0.114 * png.data[i + 2]);
    }
  }
  const color = Buffer.alloc((ANCHO / 2) * (ALTO / 2), 128); // sin color (gris)
  const partes = [Buffer.from(`YUV4MPEG2 W${ANCHO} H${ALTO} F10:1 Ip A1:1 C420jpeg\n`)];
  for (let c = 0; c < CUADROS; c += 1) partes.push(Buffer.from('FRAME\n'), Y, color, color);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, Buffer.concat(partes));
}

module.exports = { crearVideoDeQr };
