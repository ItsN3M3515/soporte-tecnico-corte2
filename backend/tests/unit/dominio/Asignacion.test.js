const {
  BusquedaPorEdificio,
  FallbackCercaniaDecorator,
  CualquieraDeLaSedeDecorator,
  MapaCercania,
} = require('../../../src/domain/busqueda/busqueda');
const { GestorAsignaciones } = require('../../../src/domain/asignacion/GestorAsignaciones');
const { PoliticaImpactoYEspera } = require('../../../src/domain/prioridad/politicas');
const { construirCadenaEscalacion, EscalacionHandler } = require('../../../src/domain/escalacion/cadena');
const { nuevoTecnico, nuevaSolicitud } = require('../../dobles/fakes');

const mapa = new MapaCercania({ 'Edificio O': ['Edificio K', 'Ad Portas'] });
const busquedaCompleta = () =>
  new CualquieraDeLaSedeDecorator(new FallbackCercaniaDecorator(new BusquedaPorEdificio(), mapa));

describe('Búsqueda de técnico (Decorator) y multisede', () => {
  test('prefiere al técnico disponible del mismo edificio', () => {
    const tecnicos = [nuevoTecnico('MIGUEL', 'CAMPUS', 'Ad Portas'), nuevoTecnico('LAURA', 'CAMPUS', 'Edificio K')];
    const s = nuevaSolicitud({ edificio: 'Edificio K' });

    expect(busquedaCompleta().buscarTecnico(s, tecnicos).id).toBe('LAURA');
  });

  test('sin técnico en el edificio, usa el más cercano según el mapa (orden importa)', () => {
    const tecnicos = [nuevoTecnico('MIGUEL', 'CAMPUS', 'Ad Portas'), nuevoTecnico('LAURA', 'CAMPUS', 'Edificio K')];
    const s = nuevaSolicitud({ edificio: 'Edificio O' });

    expect(busquedaCompleta().buscarTecnico(s, tecnicos).id).toBe('LAURA');
  });

  test('si el cercano está ocupado, pasa al siguiente cercano', () => {
    const tecnicos = [nuevoTecnico('LAURA', 'CAMPUS', 'Edificio K', 'OCUPADO'), nuevoTecnico('MIGUEL', 'CAMPUS', 'Ad Portas')];
    const s = nuevaSolicitud({ edificio: 'Edificio O' });

    expect(busquedaCompleta().buscarTecnico(s, tecnicos).id).toBe('MIGUEL');
  });

  test('sin cercanos disponibles, toma cualquiera libre de la misma sede', () => {
    const tecnicos = [nuevoTecnico('SOFIA', 'CAMPUS', 'Edificio H')];
    const s = nuevaSolicitud({ edificio: 'Edificio O' });

    expect(busquedaCompleta().buscarTecnico(s, tecnicos).id).toBe('SOFIA');
  });

  test('NUNCA asigna un técnico de otra sede aunque sea el único libre', () => {
    const tecnicos = [nuevoTecnico('ANDRES', 'NORTE', 'Bloque A'), nuevoTecnico('LAURA', 'CAMPUS', 'Edificio K', 'ASIGNADO')];
    const s = nuevaSolicitud({ edificio: 'Edificio K', sede: 'CAMPUS' });

    expect(busquedaCompleta().buscarTecnico(s, tecnicos)).toBeNull();
  });

  test('la búsqueda base sola no hace fallback', () => {
    const tecnicos = [nuevoTecnico('LAURA', 'CAMPUS', 'Edificio K')];
    expect(new BusquedaPorEdificio().buscarTecnico(nuevaSolicitud({ edificio: 'Edificio O' }), tecnicos)).toBeNull();
  });

  test('un edificio que no está en el mapa no tiene cercanos', () => {
    expect(mapa.edificiosCercanosA('Edificio Z')).toEqual([]);
  });

  // Hallazgo del escaneo de código: un edificio llamado "constructor" devolvía la función Object.
  test.each(['constructor', '__proto__', 'toString'])('un edificio llamado "%s" no rompe la búsqueda', (edificio) => {
    expect(mapa.edificiosCercanosA(edificio)).toEqual([]);
    const s = nuevaSolicitud({ edificio });
    expect(busquedaCompleta().buscarTecnico(s, [nuevoTecnico('L', 'CAMPUS', 'Edificio K')]).id).toBe('L');
  });
});

describe('GestorAsignaciones', () => {
  const T0 = 1_000_000_000;
  let gestor;

  beforeEach(() => {
    gestor = new GestorAsignaciones({ busqueda: busquedaCompleta(), politicaPrioridad: new PoliticaImpactoYEspera() });
  });

  test('usa la estrategia de búsqueda inyectada (doble de prueba)', () => {
    const elegido = nuevoTecnico('X', 'CAMPUS', 'Edificio K');
    const busquedaStub = { buscarTecnico: jest.fn().mockReturnValue(elegido) };
    const g = new GestorAsignaciones({ busqueda: busquedaStub, politicaPrioridad: new PoliticaImpactoYEspera() });
    const s = nuevaSolicitud();

    const t = g.asignar(s, [elegido], T0);

    expect(busquedaStub.buscarTecnico).toHaveBeenCalledWith(s, [elegido]);
    expect(t).toBe(elegido);
    expect(s.tecnicoId).toBe('X');
  });

  test('si no hay técnico, la solicitud queda PENDIENTE en la cola', () => {
    const s = nuevaSolicitud();
    expect(gestor.asignar(s, [], T0)).toBeNull();
    expect(s.estado).toBe('PENDIENTE');
  });

  test('reasignar excluye al técnico que no respondió', () => {
    const laura = nuevoTecnico('LAURA', 'CAMPUS', 'Edificio K');
    const miguel = nuevoTecnico('MIGUEL', 'CAMPUS', 'Ad Portas');
    const s = nuevaSolicitud({ edificio: 'Edificio K' });
    gestor.asignar(s, [laura, miguel], T0);

    const nuevo = gestor.reasignar(s, laura, [laura, miguel], T0 + 1);

    expect(nuevo.id).toBe('MIGUEL');
    expect(laura.estaDisponible()).toBe(true);
    expect(s.tecnicoId).toBe('MIGUEL');
  });

  test('no reasigna si el técnico ya aceptó', () => {
    const laura = nuevoTecnico('LAURA', 'CAMPUS', 'Edificio K');
    const s = nuevaSolicitud();
    gestor.asignar(s, [laura], T0);
    laura.aceptar(s);

    expect(gestor.reasignar(s, laura, [laura, nuevoTecnico('M', 'CAMPUS', 'Ad Portas')], T0)).toBeNull();
    expect(s.tecnicoId).toBe('LAURA');
  });

  test('al quedar libre, el técnico toma la solicitud más prioritaria de SU sede', () => {
    const laura = nuevoTecnico('LAURA', 'CAMPUS', 'Edificio K');
    const prestamo = nuevaSolicitud({ id: 'P', tipo: 'PRESTAMO_EQUIPO', creadaEn: T0 });
    const urgente = nuevaSolicitud({ id: 'U', claseEnCurso: true, creadaEn: T0 });
    const otraSede = nuevaSolicitud({ id: 'N', sede: 'NORTE', claseEnCurso: true, creadaEn: T0 - 3600000 });
    const yaAsignada = nuevaSolicitud({ id: 'A', estado: 'ASIGNADA', claseEnCurso: true });

    const siguiente = gestor.siguienteParaTecnico(laura, [prestamo, urgente, otraSede, yaAsignada], T0);

    expect(siguiente.id).toBe('U');
    expect(laura.solicitudActualId).toBe('U');
  });

  test('un técnico ocupado no toma nada de la cola', () => {
    const ocupado = nuevoTecnico('O', 'CAMPUS', 'Edificio K', 'OCUPADO');
    expect(gestor.siguienteParaTecnico(ocupado, [nuevaSolicitud()], T0)).toBeNull();
  });

  test('con la cola vacía no asigna nada', () => {
    expect(gestor.siguienteParaTecnico(nuevoTecnico('L', 'CAMPUS', 'Edificio K'), [], T0)).toBeNull();
  });
});

describe('Cadena de escalación (Chain of Responsibility)', () => {
  const T0 = 1_000_000_000;
  let gestor;
  let cadena;

  beforeEach(() => {
    gestor = new GestorAsignaciones({ busqueda: busquedaCompleta(), politicaPrioridad: new PoliticaImpactoYEspera() });
    cadena = construirCadenaEscalacion(gestor);
  });

  test('si el técnico ya aceptó, la cadena se detiene en el primer eslabón', () => {
    const laura = nuevoTecnico('LAURA', 'CAMPUS', 'Edificio K');
    const s = nuevaSolicitud();
    gestor.asignar(s, [laura], T0);
    laura.aceptar(s);

    expect(cadena.manejar({ solicitud: s, tecnicoAsignado: laura, tecnicos: [laura], ahora: T0 }).accion).toBe('YA_ATENDIDA');
  });

  test('si no respondió y hay otro técnico, se reasigna', () => {
    const laura = nuevoTecnico('LAURA', 'CAMPUS', 'Edificio K');
    const sofia = nuevoTecnico('SOFIA', 'CAMPUS', 'Edificio H');
    const s = nuevaSolicitud();
    gestor.asignar(s, [laura], T0);

    const r = cadena.manejar({ solicitud: s, tecnicoAsignado: laura, tecnicos: [laura, sofia], ahora: T0 });

    expect(r).toMatchObject({ accion: 'REASIGNADA' });
    expect(r.tecnicoNuevo.id).toBe('SOFIA');
  });

  test('si no hay nadie más, llega al coordinador y la solicitud queda ESCALADA (nunca se pierde)', () => {
    const laura = nuevoTecnico('LAURA', 'CAMPUS', 'Edificio K');
    const s = nuevaSolicitud();
    gestor.asignar(s, [laura], T0);

    const r = cadena.manejar({ solicitud: s, tecnicoAsignado: laura, tecnicos: [laura], ahora: T0 });

    expect(r.accion).toBe('ESCALADA');
    expect(s.estado).toBe('ESCALADA');
    expect(laura.estaDisponible()).toBe(true);
  });

  test('una solicitud pendiente sin técnico también termina escalada', () => {
    const s = nuevaSolicitud();
    const r = cadena.manejar({ solicitud: s, tecnicoAsignado: null, tecnicos: [], ahora: T0 });
    expect(r.accion).toBe('ESCALADA');
  });

  test('un eslabón sin siguiente devuelve SIN_ACCION y la clase base es abstracta', () => {
    const suelto = new EscalacionHandler();
    expect(suelto.pasar({})).toEqual({ accion: 'SIN_ACCION' });
    expect(() => suelto.manejar({})).toThrow('Implementar');
  });
});
