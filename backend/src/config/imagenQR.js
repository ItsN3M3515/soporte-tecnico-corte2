const QRCode = require('qrcode');
const { CodigoQR } = require('../domain/modelo/CodigoQR');

/**
 * Genera la imagen PNG del QR que se imprime y se pega en cada equipo.
 * La usan el script `npm run qr` (para imprimir) y la prueba de escaneo
 * (tests/integration/escaneoQR.int.test.js), así se prueba exactamente la misma imagen.
 */
// Corrección de errores nivel H (recupera hasta ~30 % de los datos): el sticker vive pegado
// a un equipo y se raya. La prueba de escaneo mostró que con nivel M un rayón del 5 % en el
// centro ya impedía leerlo; con H un daño del 10 % se sigue leyendo.
const OPCIONES_QR = { width: 300, margin: 2, errorCorrectionLevel: 'H' };

const imagenQR = (codigoEquipo, opciones = {}) => QRCode.toBuffer(CodigoQR.generarTexto(codigoEquipo), { ...OPCIONES_QR, ...opciones });

module.exports = { imagenQR, OPCIONES_QR };
