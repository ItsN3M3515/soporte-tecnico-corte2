const { FabricaSolicitudes, MAX_CANTIDAD, MAX_DIAS_AGENDA } = require('../../../src/domain/modelo/FabricaSolicitudes');
const { PoliticaImpactoYEspera } = require('../../../src/domain/prioridad/politicas');
const { ColaPrioridad } = require('../../../src/domain/prioridad/ColaPrioridad');
const { DatoInvalido, TransicionInvalida } = require('../../../src/domain/errores');
const { EQUIPOS, nuevaSolicitud, nuevoTecnico } = require('../../dobles/fakes');

/**
 * Servicios del prototipo AsisTec (Figma, pantallas 3b, 3c, 9, 12, 13 y 14).
 * Cada tipo nuevo se agregó registrando un creador en la fábrica (Factory Method):
 * estas pruebas fijan sus reglas de creación y cómo entran a la cola de prioridades.
 */
const AHORA = Date.UTC(2026, 8, 22, 15, 0, 0);
const HORA = 60 * 60 * 1000;
const salon = { salon: '201', edificio: 'Edificio K', sede: 'CAMPUS' }; // préstamo/evento: salón, sin equipo
const [equipo] = EQUIPOS;

describe('FabricaSolicitudes — servicios del prototipo', () => {
  let fabrica;
  beforeEach(() => {
    let n = 0;
    fabrica = new FabricaSolicitudes(() => `S-${(n += 1)}`);
  });
  const crear = (entrada) => fabrica.crear({ ahora: AHORA, creadaPor: 'docente', ubicacion: salon, ...entrada });

  describe('préstamo (pantallas 3b y 3c)', () => {
    test('"Lo necesito ahora" por salón: queda PENDIENTE, con clase en curso y los datos de la configuración', () => {
      const s = crear({ tipo: 'PRESTAMO_EQUIPO', datos: { recurso: 'PORTATIL', cantidad: 2, requiereInternet: true } });

      expect(s).toMatchObject({ estado: 'PENDIENTE', claseEnCurso: true, codigoEquipo: null, salon: '201', detalle: 'PORTATIL' });
      expect(s.datos).toEqual({ recurso: 'PORTATIL', cantidad: 2, requiereInternet: true, requiereSoftware: false, software: null });
    });

    test('"Agendar para después": queda PROGRAMADA, sin clase en curso y con la fecha elegida', () => {
      const s = crear({ tipo: 'PRESTAMO_EQUIPO', datos: { recurso: 'EXTENSION' }, programadaPara: AHORA + 3 * HORA });
      expect(s).toMatchObject({ estado: 'PROGRAMADA', claseEnCurso: false, programadaPara: AHORA + 3 * HORA });
    });

    // Valores límite de "Cantidad de equipos"
    test.each([[1], [MAX_CANTIDAD]])('cantidad %i es válida', (cantidad) => {
      expect(crear({ tipo: 'PRESTAMO_EQUIPO', datos: { recurso: 'PORTATIL', cantidad } }).datos.cantidad).toBe(cantidad);
    });

    test.each([[0], [MAX_CANTIDAD + 1], [2.5], ['3']])('cantidad %p se rechaza', (cantidad) => {
      expect(() => crear({ tipo: 'PRESTAMO_EQUIPO', datos: { recurso: 'PORTATIL', cantidad } })).toThrow(DatoInvalido);
    });

    test('si activa "Acceso a páginas/software específico" debe decir cuál', () => {
      expect(() => crear({ tipo: 'PRESTAMO_EQUIPO', datos: { recurso: 'PORTATIL', requiereSoftware: true } })).toThrow('Indique qué páginas');
      const s = crear({ tipo: 'PRESTAMO_EQUIPO', datos: { recurso: 'PORTATIL', requiereSoftware: true, software: ' Autodesk ' } });
      expect(s.datos.software).toBe('Autodesk');
    });

    test('con el interruptor apagado, el texto de software se descarta', () => {
      const s = crear({ tipo: 'PRESTAMO_EQUIPO', datos: { recurso: 'PORTATIL', requiereSoftware: false, software: 'Autodesk' } });
      expect(s.datos.software).toBeNull();
    });
  });

  describe('agenda (calendario de las pantallas 3c, 12 y 13)', () => {
    test.each([
      ['en el pasado', AHORA - 1],
      ['justo ahora', AHORA],
      [`a más de ${MAX_DIAS_AGENDA} días`, AHORA + (MAX_DIAS_AGENDA * 24 + 1) * HORA],
      ['que no es un número', 'mañana'],
    ])('una fecha %s se rechaza', (_caso, programadaPara) => {
      expect(() => crear({ tipo: 'PRESTAMO_EQUIPO', datos: { recurso: 'PORTATIL' }, programadaPara })).toThrow(DatoInvalido);
    });

    test(`una fecha a exactamente ${MAX_DIAS_AGENDA} días es válida (borde)`, () => {
      const programadaPara = AHORA + MAX_DIAS_AGENDA * 24 * HORA;
      expect(crear({ tipo: 'PRESTAMO_EQUIPO', datos: { recurso: 'PORTATIL' }, programadaPara }).estado).toBe('PROGRAMADA');
    });

    test('mantenimiento y evento exigen fecha', () => {
      expect(() => crear({ tipo: 'MANTENIMIENTO', datos: { tipoRevision: 'GENERAL' } })).toThrow('Elija la fecha');
      expect(() => crear({ tipo: 'SOPORTE_EVENTO', datos: { nombreEvento: 'Feria' } })).toThrow('Elija la fecha');
    });

    test('las fallas no se pueden agendar: se atienden de inmediato', () => {
      expect(() => crear({ tipo: 'FALLA_ELECTRICA', datos: { tipoFalla: 'SIN_ENERGIA' }, programadaPara: AHORA + HORA })).toThrow('no se puede agendar');
      expect(() => crear({ tipo: 'FALLA_EQUIPO_FIJO', ubicacion: equipo, programadaPara: AHORA + HORA })).toThrow('no se puede agendar');
    });
  });

  describe('mantenimiento, evento y falla eléctrica (pantallas 12, 13 y 14)', () => {
    test('mantenimiento con tipo de revisión y notas', () => {
      const s = crear({ tipo: 'MANTENIMIENTO', datos: { tipoRevision: 'AIRE_ACONDICIONADO', notas: 'Gotea' }, programadaPara: AHORA + 24 * HORA });
      expect(s).toMatchObject({ estado: 'PROGRAMADA', datos: { tipoRevision: 'AIRE_ACONDICIONADO', notas: 'Gotea' } });
    });

    test('mantenimiento con un tipo de revisión que no está en los chips se rechaza', () => {
      expect(() => crear({ tipo: 'MANTENIMIENTO', datos: { tipoRevision: 'PINTURA' }, programadaPara: AHORA + HORA })).toThrow(DatoInvalido);
    });

    test('evento: nombre obligatorio y requerimientos sin repetir', () => {
      expect(() => crear({ tipo: 'SOPORTE_EVENTO', datos: { nombreEvento: '   ' }, programadaPara: AHORA + HORA })).toThrow('nombre del evento');
      const s = crear({
        tipo: 'SOPORTE_EVENTO',
        datos: { nombreEvento: 'Semana de la Ingeniería', requerimientos: ['AUDIO', 'STREAMING', 'AUDIO'] },
        programadaPara: AHORA + HORA,
      });
      expect(s.datos.requerimientos).toEqual(['AUDIO', 'STREAMING']);
    });

    test.each([[['KARAOKE']], ['AUDIO']])('evento con requerimientos %p se rechaza', (requerimientos) => {
      expect(() => crear({ tipo: 'SOPORTE_EVENTO', datos: { nombreEvento: 'Feria', requerimientos }, programadaPara: AHORA + HORA })).toThrow(DatoInvalido);
    });

    test('falla eléctrica: el chip elegido es obligatorio y la descripción queda como detalle', () => {
      expect(() => crear({ tipo: 'FALLA_ELECTRICA', datos: {} })).toThrow('Tipo de falla');
      const s = crear({ tipo: 'FALLA_ELECTRICA', datos: { tipoFalla: 'CABLE_EXPUESTO', descripcion: 'Junto a la puerta' } });
      expect(s).toMatchObject({ estado: 'PENDIENTE', claseEnCurso: true, detalle: 'Junto a la puerta' });
    });
  });

  test('una falla de equipo sin equipo (solo el salón) se rechaza: hay que escanear o buscarlo', () => {
    expect(() => crear({ tipo: 'FALLA_EQUIPO_FIJO' })).toThrow('escanee su QR');
  });

  test('sin salón no se crea nada', () => {
    expect(() => fabrica.crear({ tipo: 'PRESTAMO_EQUIPO', datos: { recurso: 'PORTATIL' }, ahora: AHORA })).toThrow('Falta el salón');
  });
});

describe('Prioridad de los servicios nuevos (Strategy)', () => {
  test('con clase en curso: falla de equipo > falla eléctrica > evento > préstamo > mantenimiento', () => {
    const tipos = ['MANTENIMIENTO', 'PRESTAMO_EQUIPO', 'SOPORTE_EVENTO', 'FALLA_ELECTRICA', 'FALLA_EQUIPO_FIJO'];
    const solicitudes = tipos.map((tipo) => nuevaSolicitud({ id: tipo, tipo, claseEnCurso: true, creadaEn: AHORA }));

    const orden = ColaPrioridad.desde(solicitudes, new PoliticaImpactoYEspera(), AHORA).aListaOrdenada().map((c) => c.solicitud.id);

    expect(orden).toEqual(['FALLA_EQUIPO_FIJO', 'FALLA_ELECTRICA', 'SOPORTE_EVENTO', 'PRESTAMO_EQUIPO', 'MANTENIMIENTO']);
  });

  test('una agendada empieza a envejecer cuando se activa, no cuando se pidió', () => {
    const s = nuevaSolicitud({ estado: 'PROGRAMADA', creadaEn: AHORA - 48 * HORA, programadaPara: AHORA });
    s.activar(AHORA);
    expect(s.minutosEsperando(AHORA + 5 * 60000)).toBe(5);
  });
});

describe('Solicitud y Técnico — transiciones nuevas', () => {
  test('activar solo aplica a una PROGRAMADA', () => {
    expect(() => nuevaSolicitud({ estado: 'PENDIENTE' }).activar(AHORA)).toThrow(TransicionInvalida);
  });

  test('liberar sin técnico asignado no tiene sentido', () => {
    expect(() => nuevaSolicitud({ estado: 'PENDIENTE' }).liberar()).toThrow(TransicionInvalida);
  });

  test('escalar guarda cuándo y por qué (lo que lee el coordinador)', () => {
    const s = nuevaSolicitud();
    s.escalar(AHORA, 'Sin técnicos disponibles cercanos');
    expect(s).toMatchObject({ estado: 'ESCALADA', escaladaEn: AHORA, motivoEscalacion: 'Sin técnicos disponibles cercanos' });
  });

  test('"Cancelar" en camino: el técnico queda disponible y la solicitud vuelve a PENDIENTE', () => {
    const t = nuevoTecnico('T1', 'CAMPUS', 'Edificio K');
    const s = nuevaSolicitud();
    t.asignar(s, AHORA);
    t.aceptar(s);

    t.cancelarAsignacion(s);

    expect(t.nombreEstado).toBe('DISPONIBLE');
    expect(s).toMatchObject({ estado: 'PENDIENTE', tecnicoId: null });
  });

  test('ya en el salón (OCUPADO) no se puede cancelar: hay que finalizar', () => {
    const t = nuevoTecnico('T1', 'CAMPUS', 'Edificio K');
    const s = nuevaSolicitud();
    t.asignar(s, AHORA);
    t.aceptar(s);
    t.confirmarLlegada();
    expect(() => t.cancelarAsignacion(s)).toThrow(TransicionInvalida);
  });
});
