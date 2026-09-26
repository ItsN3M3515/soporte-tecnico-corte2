const { DatoInvalido } = require('../errores');

/**
 * Objeto de valor que representa el contenido de un QR pegado en un equipo.
 *
 * Formato:  SOPORTE:v1:<codigoEquipo>
 * Ejemplo:  SOPORTE:v1:PDC-K-101-VB01   (sede-edificio-salón-equipo)
 *
 * Reto "QR asociado al PC": el QR solo lleva el identificador del equipo.
 * La ubicación (salón, edificio, sede) NO viaja en el QR, se resuelve en el
 * backend. Así un QR manipulado no puede "mover" un equipo a otro edificio.
 */
const PREFIJO = 'SOPORTE';
const VERSION_SOPORTADA = 'v1';
const LONGITUD_MIN_CODIGO = 5;
const LONGITUD_MAX_CODIGO = 40;
// Sin cuantificadores anidados (el escaneo marcó la versión anterior como posible ReDoS):
// solo letras, números y guiones; la estructura se valida aparte en `formatoValido`.
const CARACTERES_PERMITIDOS = /^[A-Z0-9-]+$/;
const formatoValido = (codigo) =>
  CARACTERES_PERMITIDOS.test(codigo) && codigo.includes('-') && !codigo.startsWith('-') && !codigo.endsWith('-') && !codigo.includes('--');

class CodigoQR {
  constructor(codigoEquipo) {
    this.codigoEquipo = codigoEquipo;
    Object.freeze(this);
  }

  static desdeTexto(texto) {
    if (typeof texto !== 'string' || texto.trim() === '') {
      throw new DatoInvalido('El QR está vacío.');
    }
    const partes = texto.trim().split(':');
    if (partes.length !== 3 || partes[0] !== PREFIJO) {
      throw new DatoInvalido('El QR no pertenece al sistema de soporte.');
    }
    if (partes[1] !== VERSION_SOPORTADA) {
      throw new DatoInvalido(`Versión de QR no soportada: ${partes[1]}.`);
    }
    const codigo = partes[2].toUpperCase();
    if (codigo.length < LONGITUD_MIN_CODIGO || codigo.length > LONGITUD_MAX_CODIGO) {
      throw new DatoInvalido(
        `El código de equipo debe tener entre ${LONGITUD_MIN_CODIGO} y ${LONGITUD_MAX_CODIGO} caracteres.`,
      );
    }
    if (!formatoValido(codigo)) {
      throw new DatoInvalido('El código de equipo tiene caracteres no permitidos.');
    }
    return new CodigoQR(codigo);
  }

  static generarTexto(codigoEquipo) {
    return `${PREFIJO}:${VERSION_SOPORTADA}:${codigoEquipo}`;
  }
}

module.exports = { CodigoQR, LONGITUD_MIN_CODIGO, LONGITUD_MAX_CODIGO };
