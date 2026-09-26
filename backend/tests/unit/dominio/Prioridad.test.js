const {
  PoliticaImpactoYEspera,
  PoliticaOrdenDeLlegada,
  PUNTOS_BASE,
  PUNTOS_POR_MINUTO,
  TOPE_MINUTOS_AGING,
} = require('../../../src/domain/prioridad/politicas');
const { ColaPrioridad } = require('../../../src/domain/prioridad/ColaPrioridad');
const { nuevaSolicitud } = require('../../dobles/fakes');

/** Reto: "Reporte en tiempo real, cola de prioridades". */
const T0 = 1_000_000_000;
const minutos = (m) => T0 + m * 60000;

describe('PoliticaImpactoYEspera (Strategy)', () => {
  const politica = new PoliticaImpactoYEspera();

  test.each([
    ['FALLA_EQUIPO_FIJO', true, PUNTOS_BASE.get('FALLA_EQUIPO_FIJO').conClase],
    ['FALLA_EQUIPO_FIJO', false, PUNTOS_BASE.get('FALLA_EQUIPO_FIJO').sinClase],
    ['PRESTAMO_EQUIPO', true, PUNTOS_BASE.get('PRESTAMO_EQUIPO').conClase],
    ['PRESTAMO_EQUIPO', false, PUNTOS_BASE.get('PRESTAMO_EQUIPO').sinClase],
  ])('%s con clase en curso=%s recién creada vale %i', (tipo, claseEnCurso, esperado) => {
    const s = nuevaSolicitud({ tipo, claseEnCurso, creadaEn: T0 });
    expect(politica.calcular(s, T0)).toBe(esperado);
  });

  // Valores límite del envejecimiento (aging): 0, 1, tope-1, tope, tope+1 minutos
  test.each([
    [0, 0],
    [1, PUNTOS_POR_MINUTO],
    [TOPE_MINUTOS_AGING - 1, (TOPE_MINUTOS_AGING - 1) * PUNTOS_POR_MINUTO],
    [TOPE_MINUTOS_AGING, TOPE_MINUTOS_AGING * PUNTOS_POR_MINUTO],
    [TOPE_MINUTOS_AGING + 1, TOPE_MINUTOS_AGING * PUNTOS_POR_MINUTO],
    [600, TOPE_MINUTOS_AGING * PUNTOS_POR_MINUTO],
  ])('tras %i minutos suma %i puntos de espera', (m, extra) => {
    const s = nuevaSolicitud({ tipo: 'PRESTAMO_EQUIPO', claseEnCurso: false, creadaEn: T0 });
    expect(politica.calcular(s, minutos(m))).toBe(PUNTOS_BASE.get('PRESTAMO_EQUIPO').sinClase + extra);
  });

  test('una solicitud de baja prioridad que espera lo suficiente supera a una urgente recién llegada (sin inanición)', () => {
    const vieja = nuevaSolicitud({ tipo: 'PRESTAMO_EQUIPO', claseEnCurso: false, creadaEn: T0 });
    const urgente = nuevaSolicitud({ tipo: 'FALLA_EQUIPO_FIJO', claseEnCurso: true, creadaEn: minutos(40) });
    const ahora = minutos(40);

    expect(politica.calcular(vieja, ahora)).toBeGreaterThan(politica.calcular(urgente, ahora));
  });
});

describe('ColaPrioridad', () => {
  const politica = new PoliticaImpactoYEspera();

  test('una cola vacía no devuelve nada', () => {
    const cola = new ColaPrioridad(politica, T0);
    expect(cola.estaVacia()).toBe(true);
    expect(cola.desencolar()).toBeNull();
    expect(cola.verSiguiente()).toBeNull();
  });

  test('saca primero la de mayor prioridad', () => {
    const prestamo = nuevaSolicitud({ id: 'P', tipo: 'PRESTAMO_EQUIPO', creadaEn: T0 });
    const fallaConClase = nuevaSolicitud({ id: 'F', claseEnCurso: true, creadaEn: minutos(1) });
    const fallaSinClase = nuevaSolicitud({ id: 'S', creadaEn: minutos(1) });

    const cola = ColaPrioridad.desde([prestamo, fallaSinClase, fallaConClase], politica, minutos(1));

    expect([cola.desencolar().id, cola.desencolar().id, cola.desencolar().id]).toEqual(['F', 'S', 'P']);
    expect(cola.estaVacia()).toBe(true);
  });

  test('con igual prioridad respeta el orden de llegada (FIFO)', () => {
    const politicaFija = { calcular: () => 10 }; // stub: todas valen lo mismo
    const a = nuevaSolicitud({ id: 'A', creadaEn: T0 + 2 });
    const b = nuevaSolicitud({ id: 'B', creadaEn: T0 + 1 });
    const c = nuevaSolicitud({ id: 'C', creadaEn: T0 + 3 });

    const cola = ColaPrioridad.desde([a, b, c], politicaFija, T0);

    expect(cola.aListaOrdenada().map((x) => x.solicitud.id)).toEqual(['B', 'A', 'C']);
  });

  test('con igual prioridad y hora desempata por id (resultado determinista)', () => {
    const politicaFija = { calcular: () => 10 };
    const cola = ColaPrioridad.desde(
      [nuevaSolicitud({ id: 'Z', creadaEn: T0 }), nuevaSolicitud({ id: 'M', creadaEn: T0 })],
      politicaFija,
      T0,
    );
    expect(cola.desencolar().id).toBe('M');
  });

  test('aListaOrdenada no vacía la cola original', () => {
    const cola = ColaPrioridad.desde([nuevaSolicitud(), nuevaSolicitud()], politica, T0);
    const lista = cola.aListaOrdenada();
    expect(lista).toHaveLength(2);
    expect(cola.tamano).toBe(2);
  });

  test('mantiene el orden correcto con muchos elementos (propiedad del montículo)', () => {
    const solicitudes = Array.from({ length: 200 }, (_, i) =>
      nuevaSolicitud({ id: `X${i}`, tipo: i % 3 ? 'FALLA_EQUIPO_FIJO' : 'PRESTAMO_EQUIPO', claseEnCurso: i % 2 === 0, creadaEn: T0 - ((i * 7919) % 90) * 60000 }),
    );
    const cola = ColaPrioridad.desde(solicitudes, politica, T0);
    const prioridades = cola.aListaOrdenada().map((x) => x.prioridad);
    const ordenadas = [...prioridades].sort((x, y) => y - x);
    expect(prioridades).toEqual(ordenadas);
  });

  test('con la política de orden de llegada se comporta como una cola FIFO (el Strategy es intercambiable)', () => {
    const urgente = nuevaSolicitud({ id: 'URG', claseEnCurso: true, creadaEn: minutos(5) });
    const vieja = nuevaSolicitud({ id: 'VIEJA', tipo: 'PRESTAMO_EQUIPO', creadaEn: T0 });

    const cola = ColaPrioridad.desde([urgente, vieja], new PoliticaOrdenDeLlegada(), minutos(5));

    expect(cola.desencolar().id).toBe('VIEJA');
  });
});
