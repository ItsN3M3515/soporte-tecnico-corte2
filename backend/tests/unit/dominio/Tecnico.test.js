const { Tecnico } = require('../../../src/domain/tecnicos/Tecnico');
const { estadoDesdeNombre, EstadoTecnico } = require('../../../src/domain/tecnicos/estados');
const { TransicionInvalida } = require('../../../src/domain/errores');
const { EstadoSolicitud } = require('../../../src/domain/modelo/enums');
const { nuevaSolicitud } = require('../../dobles/fakes');

/** Patrón State: ciclo DISPONIBLE → ASIGNADO → EN_CAMINO → OCUPADO → DISPONIBLE. */
describe('Tecnico (State)', () => {
  let tecnico;
  let solicitud;

  beforeEach(() => {
    tecnico = new Tecnico({ id: 'T1', nombre: 'Laura', sede: 'CAMPUS', edificioBase: 'Edificio K' });
    solicitud = nuevaSolicitud();
  });

  test('recorre el ciclo completo y deja la solicitud resuelta', () => {
    // Arrange: técnico disponible, solicitud pendiente
    // Act
    tecnico.asignar(solicitud, 10);
    tecnico.aceptar(solicitud);
    tecnico.confirmarLlegada();
    tecnico.finalizar(solicitud, 99);
    // Assert
    expect(tecnico.nombreEstado).toBe('DISPONIBLE');
    expect(tecnico.solicitudActualId).toBeNull();
    expect(solicitud.estado).toBe(EstadoSolicitud.RESUELTA);
    expect(solicitud.resueltaEn).toBe(99);
  });

  test('al asignar queda esperando respuesta y la solicitud guarda el técnico', () => {
    tecnico.asignar(solicitud, 10);

    expect(tecnico.estaEsperandoRespuesta()).toBe(true);
    expect(tecnico.estaDisponible()).toBe(false);
    expect(solicitud).toMatchObject({ estado: 'ASIGNADA', tecnicoId: 'T1', asignadaEn: 10 });
  });

  test('cancelar una asignación devuelve la solicitud a la cola', () => {
    tecnico.asignar(solicitud, 10);

    tecnico.cancelarAsignacion(solicitud);

    expect(tecnico.estaDisponible()).toBe(true);
    expect(solicitud).toMatchObject({ estado: 'PENDIENTE', tecnicoId: null, asignadaEn: null });
  });

  describe('transiciones inválidas', () => {
    test.each([
      ['DISPONIBLE', 'aceptar', (t, s) => t.aceptar(s)],
      ['DISPONIBLE', 'confirmarLlegada', (t) => t.confirmarLlegada()],
      ['DISPONIBLE', 'finalizar', (t, s) => t.finalizar(s, 1)],
      ['DISPONIBLE', 'cancelarAsignacion', (t, s) => t.cancelarAsignacion(s)],
      ['ASIGNADO', 'asignar', (t, s) => t.asignar(s, 1)],
      ['ASIGNADO', 'confirmarLlegada', (t) => t.confirmarLlegada()],
      ['ASIGNADO', 'finalizar', (t, s) => t.finalizar(s, 1)],
      ['EN_CAMINO', 'aceptar', (t, s) => t.aceptar(s)],
      ['EN_CAMINO', 'finalizar', (t, s) => t.finalizar(s, 1)],
      ['EN_CAMINO', 'cancelarAsignacion', (t, s) => t.cancelarAsignacion(s)],
      ['OCUPADO', 'asignar', (t, s) => t.asignar(s, 1)],
      ['OCUPADO', 'confirmarLlegada', (t) => t.confirmarLlegada()],
    ])('en %s no se permite %s', (estado, _nombre, accion) => {
      const t = new Tecnico({ id: 'T2', nombre: 'Miguel', sede: 'CAMPUS', edificioBase: 'Ad Portas', estado });
      expect(() => accion(t, solicitud)).toThrow(TransicionInvalida);
      expect(t.nombreEstado).toBe(estado); // el estado no se corrompe
    });
  });

  test('rehidrata el estado desde su nombre (como viene de la BD)', () => {
    expect(estadoDesdeNombre('EN_CAMINO').nombre).toBe('EN_CAMINO');
    expect(() => estadoDesdeNombre('DE_VACACIONES')).toThrow('Estado de técnico desconocido');
  });

  // Hallazgo del escaneo de código (security/detect-object-injection): un nombre como
  // "toString" o "__proto__" leído de la BD devolvía una función del prototipo.
  test.each(['toString', '__proto__', 'constructor'])('rechaza el nombre heredado del prototipo "%s"', (nombre) => {
    expect(() => estadoDesdeNombre(nombre)).toThrow('Estado de técnico desconocido');
  });

  test('la clase base obliga a implementar el nombre', () => {
    expect(() => new EstadoTecnico().nombre).toThrow('Implementar');
  });

  test('aVista expone solo datos planos', () => {
    expect(tecnico.aVista()).toEqual({
      id: 'T1',
      nombre: 'Laura',
      sede: 'CAMPUS',
      edificioBase: 'Edificio K',
      estado: 'DISPONIBLE',
      solicitudActualId: null,
      telefono: null,
    });
  });
});

describe('Solicitud (reglas propias)', () => {
  test('no se puede asignar una solicitud ya resuelta', () => {
    const s = nuevaSolicitud({ estado: 'RESUELTA' });
    expect(() => s.asignarA('T1', 1)).toThrow(TransicionInvalida);
  });

  test('no se puede marcar en atención si no está asignada', () => {
    expect(() => nuevaSolicitud().marcarEnAtencion()).toThrow(TransicionInvalida);
  });

  test('no se puede resolver si no está en atención', () => {
    expect(() => nuevaSolicitud({ estado: 'ASIGNADA' }).resolver(1)).toThrow(TransicionInvalida);
  });

  test('una solicitud escalada se puede volver a asignar', () => {
    const s = nuevaSolicitud({ estado: 'ESCALADA' });
    s.asignarA('T1', 5);
    expect(s.estado).toBe('ASIGNADA');
  });

  test.each([
    [0, 0],
    [59999, 0],
    [60000, 1],
    [-5000, 0], // reloj desfasado: nunca negativo
  ])('con %i ms de espera lleva %i minutos', (ms, minutos) => {
    const s = nuevaSolicitud({ creadaEn: 1_000_000 });
    expect(s.minutosEsperando(1_000_000 + ms)).toBe(minutos);
  });
});
