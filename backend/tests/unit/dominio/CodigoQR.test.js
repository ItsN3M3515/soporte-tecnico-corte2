const { CodigoQR, LONGITUD_MIN_CODIGO, LONGITUD_MAX_CODIGO } = require('../../../src/domain/modelo/CodigoQR');
const { DatoInvalido } = require('../../../src/domain/errores');

/**
 * Reto: "QR asociado al PC".
 * Clases de equivalencia: QR válido | vacío/no texto | de otro sistema | versión no soportada |
 * código con caracteres inválidos. Valores límite en la longitud del código (4, 5, 40, 41).
 */
const codigoDeLongitud = (n) => `A-${'B'.repeat(n - 2)}`;

describe('CodigoQR', () => {
  describe('clase válida', () => {
    test('extrae el código del equipo de un QR bien formado', () => {
      // Arrange
      const texto = 'SOPORTE:v1:CAM-K-101-VB01';
      // Act
      const qr = CodigoQR.desdeTexto(texto);
      // Assert
      expect(qr.codigoEquipo).toBe('CAM-K-101-VB01');
    });

    test('normaliza a mayúsculas y quita espacios alrededor', () => {
      const qr = CodigoQR.desdeTexto('  SOPORTE:v1:cam-k-101-vb01 ');
      expect(qr.codigoEquipo).toBe('CAM-K-101-VB01');
    });

    test('generarTexto y desdeTexto son inversos', () => {
      const texto = CodigoQR.generarTexto('NOR-BA-101-PC01');
      expect(CodigoQR.desdeTexto(texto).codigoEquipo).toBe('NOR-BA-101-PC01');
    });

    test('el objeto es inmutable', () => {
      const qr = CodigoQR.desdeTexto('SOPORTE:v1:CAM-K-101-VB01');
      expect(Object.isFrozen(qr)).toBe(true);
    });
  });

  describe('clases inválidas', () => {
    test.each([
      ['vacío', ''],
      ['solo espacios', '   '],
      ['no es texto', 12345],
      ['nulo', null],
    ])('rechaza QR %s', (_, entrada) => {
      expect(() => CodigoQR.desdeTexto(entrada)).toThrow(DatoInvalido);
    });

    test.each([
      ['un enlace web', 'https://unisabana.edu.co'],
      ['otro prefijo', 'WIFI:v1:CAM-K-101-VB01'],
      ['partes de más', 'SOPORTE:v1:CAM-K-101:extra'],
    ])('rechaza %s', (_, entrada) => {
      expect(() => CodigoQR.desdeTexto(entrada)).toThrow('no pertenece al sistema');
    });

    test('rechaza una versión no soportada', () => {
      expect(() => CodigoQR.desdeTexto('SOPORTE:v2:CAM-K-101-VB01')).toThrow('Versión de QR no soportada');
    });

    test.each([['CAM K 101'], ['CAM_K_101'], ['CAMK101'], ['-CAM-K'], ['CAM-K-'], ['CAM--K101'], ["CAM-K-1';DROP"]])(
      'rechaza el código con formato inválido "%s"',
      (codigo) => {
        expect(() => CodigoQR.desdeTexto(`SOPORTE:v1:${codigo}`)).toThrow(DatoInvalido);
      },
    );
  });

  describe('valores límite de longitud', () => {
    test.each([LONGITUD_MIN_CODIGO, LONGITUD_MAX_CODIGO])('código de %i caracteres (en el borde) es válido', (longitud) => {
      const texto = `SOPORTE:v1:${codigoDeLongitud(longitud)}`;
      expect(CodigoQR.desdeTexto(texto).codigoEquipo).toHaveLength(longitud);
    });

    test.each([LONGITUD_MIN_CODIGO - 1, LONGITUD_MAX_CODIGO + 1])('código de %i caracteres (fuera del borde) se rechaza', (longitud) => {
      const texto = `SOPORTE:v1:${codigoDeLongitud(longitud)}`;
      expect(() => CodigoQR.desdeTexto(texto)).toThrow('debe tener entre');
    });
  });
});
