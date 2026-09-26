const { FabricaSolicitudes, MAX_DETALLE } = require('../../../src/domain/modelo/FabricaSolicitudes');
const { EstadoSolicitud } = require('../../../src/domain/modelo/enums');
const { DatoInvalido } = require('../../../src/domain/errores');
const { EQUIPOS } = require('../../dobles/fakes');

/** Patrón Factory Method: cada tipo de solicitud tiene sus reglas de creación. */
describe('FabricaSolicitudes', () => {
  const equipo = EQUIPOS[0];
  const ahora = 1000;
  let fabrica;

  beforeEach(() => {
    const generadorId = jest.fn().mockReturnValue('S-FIJO'); // stub del generador
    fabrica = new FabricaSolicitudes(generadorId);
  });

  test('crea una falla copiando la ubicación desde el equipo (no desde el QR)', () => {
    const s = fabrica.crear({ tipo: 'FALLA_EQUIPO_FIJO', equipo, claseEnCurso: true, creadaPor: 'docente', ahora });

    expect(s).toMatchObject({
      id: 'S-FIJO',
      salon: '101',
      edificio: 'Edificio O',
      sede: 'CAMPUS',
      estado: EstadoSolicitud.PENDIENTE,
      claseEnCurso: true,
      creadaEn: ahora,
      detalle: null,
    });
  });

  describe('falla de equipo: qué le pasa (depende del equipo escaneado)', () => {
    const videoBeam = { ...equipo, codigo: 'CAM-O-101-VB01', descripcion: 'Video Beam' };
    const pc = { ...equipo, codigo: 'CAM-O-101-PC01', descripcion: 'PC de salón' };
    const falla = (eq, datos) => fabrica.crear({ tipo: 'FALLA_EQUIPO_FIJO', equipo: eq, datos, ahora });

    // Clases válidas
    test.each([
      ['problema del catálogo sin descripción', videoBeam, { problema: 'SIN_IMAGEN' }, 'No proyecta imagen'],
      ['problema del catálogo con descripción', pc, { problema: 'SIN_INTERNET', descripcion: 'no carga Teams' }, 'Sin internet: no carga Teams'],
      ['"Otro problema" con descripción', pc, { problema: 'OTRO', descripcion: 'Huele a quemado' }, 'Huele a quemado'],
      ['equipo fuera del catálogo con problema genérico', { ...equipo, descripcion: 'Parlante' }, { problema: 'NO_FUNCIONA' }, 'No funciona bien'],
    ])('acepta %s', (_caso, eq, datos, detalle) => {
      const s = falla(eq, datos);
      expect(s.detalle).toBe(detalle);
      expect(s.datos.problema).toBe(datos.problema);
    });

    // Clases inválidas
    test.each([
      ['un problema de otro tipo de equipo (control remoto en un PC)', pc, { problema: 'CONTROL' }],
      ['un problema inexistente', videoBeam, { problema: 'EXPLOTO' }],
      ['"Otro problema" sin descripción', videoBeam, { problema: 'OTRO' }],
      ['"Otro problema" con descripción en blanco', videoBeam, { problema: 'OTRO', descripcion: '   ' }],
      ['una descripción de más de 200 caracteres', videoBeam, { problema: 'SIN_IMAGEN', descripcion: 'x'.repeat(MAX_DETALLE + 1) }],
    ])('rechaza %s', (_caso, eq, datos) => {
      expect(() => falla(eq, datos)).toThrow(DatoInvalido);
    });
  });

  test('crea un préstamo de portátil', () => {
    const s = fabrica.crear({ tipo: 'PRESTAMO_EQUIPO', equipo, detalle: 'PORTATIL', ahora });
    expect(s.detalle).toBe('PORTATIL');
  });

  test.each([[undefined], ['PROYECTOR'], ['']])('rechaza un préstamo con elemento "%s"', (detalle) => {
    expect(() => fabrica.crear({ tipo: 'PRESTAMO_EQUIPO', equipo, detalle, ahora })).toThrow(DatoInvalido);
  });

  test.each([[undefined], ['BORRAR'], [null], ['constructor'], ['__proto__']])('rechaza el tipo desconocido %s', (tipo) => {
    expect(() => fabrica.crear({ tipo, equipo, ahora })).toThrow('Tipo de solicitud desconocido');
  });

  const falla = (largo) => fabrica.crear({ tipo: 'FALLA_EQUIPO_FIJO', equipo, detalle: 'x'.repeat(largo), ahora });

  test(`descripción de ${MAX_DETALLE} caracteres (en el borde) es válida`, () => {
    expect(falla(MAX_DETALLE).detalle).toHaveLength(MAX_DETALLE);
  });

  test(`descripción de ${MAX_DETALLE + 1} caracteres (fuera del borde) se rechaza`, () => {
    expect(() => falla(MAX_DETALLE + 1)).toThrow(DatoInvalido);
  });
});
