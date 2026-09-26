const { CrearSolicitud } = require('../../../src/application/CrearSolicitud');
const { AtenderSolicitud } = require('../../../src/application/AtenderSolicitud');
const { EscalarVencidas } = require('../../../src/application/EscalarVencidas');
const { Consultas } = require('../../../src/application/Consultas');
const { Autenticar } = require('../../../src/application/Autenticar');
const { FabricaSolicitudes } = require('../../../src/domain/modelo/FabricaSolicitudes');
const { GestorAsignaciones } = require('../../../src/domain/asignacion/GestorAsignaciones');
const { PoliticaImpactoYEspera } = require('../../../src/domain/prioridad/politicas');
const { BusquedaPorEdificio, FallbackCercaniaDecorator, CualquieraDeLaSedeDecorator, MapaCercania } = require('../../../src/domain/busqueda/busqueda');
const { construirCadenaEscalacion } = require('../../../src/domain/escalacion/cadena');
const { NoEncontrado, DatoInvalido, TransicionInvalida, AccesoDenegado } = require('../../../src/domain/errores');
const f = require('../../dobles/fakes');

/**
 * Pruebas unitarias de la capa de APLICACIÓN.
 * Todo lo externo se reemplaza por dobles: repos en memoria (fakes), reloj falso
 * y publicador espía (jest.fn) para verificar los eventos en tiempo real.
 */
function armar({ tecnicos = [] } = {}) {
  let n = 0;
  const reloj = new f.RelojFalso();
  const publicador = { publicar: jest.fn() };
  const repoSolicitudes = new f.RepoSolicitudesFake();
  const repoTecnicos = new f.RepoTecnicosFake(tecnicos);
  const repoEquipos = new f.RepoEquiposFake(f.EQUIPOS);
  const busqueda = new CualquieraDeLaSedeDecorator(
    new FallbackCercaniaDecorator(new BusquedaPorEdificio(), new MapaCercania({ 'Edificio O': ['Edificio K'] })),
  );
  const gestor = new GestorAsignaciones({ busqueda, politicaPrioridad: new PoliticaImpactoYEspera() });
  const base = { repoSolicitudes, repoTecnicos, repoEquipos, unidadDeTrabajo: f.unidadDeTrabajoDirecta, gestor, publicador, reloj };
  return {
    ...base,
    crear: new CrearSolicitud({ ...base, fabrica: new FabricaSolicitudes(() => `S-${(n += 1)}`) }),
    atender: new AtenderSolicitud(base),
    escalar: new EscalarVencidas({ ...base, cadena: construirCadenaEscalacion(gestor), minutosSinRespuesta: 5, minutosEnCola: 10 }),
    consultas: new Consultas(base),
  };
}

const pedirFalla = (ctx, codigo = 'CAM-K-101-VB01', extra = {}) =>
  ctx.crear.ejecutar({ qr: `SOPORTE:v1:${codigo}`, tipo: 'FALLA_EQUIPO_FIJO', claseEnCurso: true, usuario: 'docente', ...extra });

const eventos = (publicador) => publicador.publicar.mock.calls.map(([evento, , destinos]) => [evento, destinos]);

describe('CrearSolicitud', () => {
  test('crea y asigna al técnico del edificio, y avisa en tiempo real a él, a la sede y al admin', () => {
    // Arrange
    const ctx = armar({ tecnicos: [f.nuevoTecnico('T-LAURA', 'CAMPUS', 'Edificio K')] });
    // Act
    const vista = pedirFalla(ctx);
    // Assert
    expect(vista).toMatchObject({ estado: 'ASIGNADA', tecnicoId: 'T-LAURA', salon: '101', sede: 'CAMPUS' });
    expect(ctx.repoTecnicos.buscarPorId('T-LAURA').nombreEstado).toBe('ASIGNADO');
    expect(eventos(ctx.publicador)).toEqual([
      ['solicitud:creada', ['admin', 'sede:CAMPUS']],
      ['solicitud:asignada', ['tecnico:T-LAURA', 'admin', 'sede:CAMPUS']],
    ]);
  });

  test('sin técnicos disponibles queda PENDIENTE y solo avisa a la sede y al admin', () => {
    const ctx = armar();
    const vista = pedirFalla(ctx);

    expect(vista.estado).toBe('PENDIENTE');
    expect(ctx.publicador.publicar).toHaveBeenCalledTimes(1);
    expect(ctx.repoSolicitudes.listarAbiertas({})).toHaveLength(1);
  });

  test('un equipo que no existe da NoEncontrado y no guarda nada', () => {
    const ctx = armar();
    expect(() => pedirFalla(ctx, 'CAM-Z-999-XX01')).toThrow(NoEncontrado);
    expect(ctx.repoSolicitudes.listarAbiertas({})).toHaveLength(0);
    expect(ctx.publicador.publicar).not.toHaveBeenCalled();
  });

  test('un QR inválido se rechaza antes de consultar el repositorio', () => {
    const ctx = armar();
    const espia = jest.spyOn(ctx.repoEquipos, 'buscarPorCodigo');
    expect(() => ctx.crear.ejecutar({ qr: 'hola', tipo: 'FALLA_EQUIPO_FIJO' })).toThrow(DatoInvalido);
    expect(espia).not.toHaveBeenCalled();
  });

  test('una solicitud de la sede NORTE nunca se asigna a un técnico del CAMPUS', () => {
    const ctx = armar({ tecnicos: [f.nuevoTecnico('T-LAURA', 'CAMPUS', 'Edificio K')] });
    const vista = pedirFalla(ctx, 'NOR-BA-101-VB01');
    expect(vista.estado).toBe('PENDIENTE');
    expect(ctx.repoTecnicos.buscarPorId('T-LAURA').estaDisponible()).toBe(true);
  });
});

describe('AtenderSolicitud (pantalla del trabajador)', () => {
  test('aceptar → llegada → finalizar resuelve y le asigna la siguiente más prioritaria', () => {
    const ctx = armar({ tecnicos: [f.nuevoTecnico('T-LAURA', 'CAMPUS', 'Edificio K')] });
    const primera = pedirFalla(ctx);
    ctx.reloj.avanzarMinutos(1);
    const prestamo = ctx.crear.ejecutar({ qr: 'SOPORTE:v1:CAM-H-101-PC01', tipo: 'PRESTAMO_EQUIPO', detalle: 'EXTENSION' });
    ctx.reloj.avanzarMinutos(1);
    const urgente = pedirFalla(ctx, 'CAM-O-101-VB01');

    ctx.atender.aceptar('T-LAURA');
    ctx.atender.confirmarLlegada('T-LAURA');
    const r = ctx.atender.finalizar('T-LAURA');

    expect(ctx.repoSolicitudes.buscarPorId(primera.id).estado).toBe('RESUELTA');
    expect(r.siguiente.id).toBe(urgente.id); // la urgente llegó después pero vale más
    expect(ctx.repoSolicitudes.buscarPorId(prestamo.id).estado).toBe('PENDIENTE');
    expect(ctx.publicador.publicar).toHaveBeenLastCalledWith('solicitud:asignada', expect.objectContaining({ id: urgente.id }), expect.arrayContaining(['tecnico:T-LAURA']));
  });

  test('finalizar con la cola vacía deja al técnico disponible', () => {
    const ctx = armar({ tecnicos: [f.nuevoTecnico('T-LAURA', 'CAMPUS', 'Edificio K')] });
    pedirFalla(ctx);
    ctx.atender.aceptar('T-LAURA');
    ctx.atender.confirmarLlegada('T-LAURA');

    const r = ctx.atender.finalizar('T-LAURA');

    expect(r.siguiente).toBeNull();
    expect(r.tecnico.estado).toBe('DISPONIBLE');
  });

  test('un técnico sin solicitud activa no puede aceptar', () => {
    const ctx = armar({ tecnicos: [f.nuevoTecnico('T-LAURA', 'CAMPUS', 'Edificio K')] });
    expect(() => ctx.atender.aceptar('T-LAURA')).toThrow(TransicionInvalida);
  });

  test('un técnico inexistente da NoEncontrado', () => {
    expect(() => armar().atender.aceptar('T-NADIE')).toThrow(NoEncontrado);
  });

  test('no puede finalizar sin haber llegado', () => {
    const ctx = armar({ tecnicos: [f.nuevoTecnico('T-LAURA', 'CAMPUS', 'Edificio K')] });
    pedirFalla(ctx);
    ctx.atender.aceptar('T-LAURA');
    expect(() => ctx.atender.finalizar('T-LAURA')).toThrow(TransicionInvalida);
  });
});

describe('EscalarVencidas', () => {
  test('antes del límite de 5 minutos no toca nada (valor límite: 4 min)', () => {
    const ctx = armar({ tecnicos: [f.nuevoTecnico('T-LAURA', 'CAMPUS', 'Edificio K')] });
    pedirFalla(ctx);
    ctx.reloj.avanzarMinutos(4);
    expect(ctx.escalar.ejecutar()).toEqual([]);
  });

  test('a los 5 minutos sin aceptar se reasigna a otro técnico (valor límite: 5 min)', () => {
    const ctx = armar({ tecnicos: [f.nuevoTecnico('T-LAURA', 'CAMPUS', 'Edificio K'), f.nuevoTecnico('T-SOFIA', 'CAMPUS', 'Edificio H')] });
    const s = pedirFalla(ctx);
    ctx.reloj.avanzarMinutos(5);

    const r = ctx.escalar.ejecutar();

    expect(r).toEqual([{ id: s.id, accion: 'REASIGNADA' }]);
    expect(ctx.repoSolicitudes.buscarPorId(s.id).tecnicoId).toBe('T-SOFIA');
    expect(ctx.repoTecnicos.buscarPorId('T-LAURA').estaDisponible()).toBe(true);
    expect(eventos(ctx.publicador)).toContainEqual(['solicitud:retirada', ['tecnico:T-LAURA']]);
  });

  test('sin nadie más, escala al coordinador', () => {
    const ctx = armar({ tecnicos: [f.nuevoTecnico('T-LAURA', 'CAMPUS', 'Edificio K')] });
    const s = pedirFalla(ctx);
    ctx.reloj.avanzarMinutos(6);

    expect(ctx.escalar.ejecutar()).toEqual([{ id: s.id, accion: 'ESCALADA' }]);
    expect(eventos(ctx.publicador)).toContainEqual(['solicitud:escalada', ['admin', 'sede:CAMPUS']]);
  });

  test.each([
    [9, 0],
    [10, 1],
  ])('una solicitud en cola %i minutos → %i escaladas (límite 10 min)', (m, esperadas) => {
    const ctx = armar();
    pedirFalla(ctx);
    ctx.reloj.avanzarMinutos(m);
    expect(ctx.escalar.ejecutar()).toHaveLength(esperadas);
  });

  test('una solicitud ya aceptada no se escala aunque pase el tiempo', () => {
    const ctx = armar({ tecnicos: [f.nuevoTecnico('T-LAURA', 'CAMPUS', 'Edificio K')] });
    pedirFalla(ctx);
    ctx.atender.aceptar('T-LAURA');
    ctx.reloj.avanzarMinutos(30);
    expect(ctx.escalar.ejecutar()).toEqual([]);
  });
});

describe('Consultas (panel técnico y administrativo)', () => {
  test('la cola de la sede sale ordenada con posición, prioridad y minutos de espera', () => {
    const ctx = armar();
    pedirFalla(ctx, 'CAM-K-101-VB01', { claseEnCurso: false });
    ctx.reloj.avanzarMinutos(2);
    const urgente = pedirFalla(ctx, 'CAM-O-101-VB01');

    const { total, items: cola } = ctx.consultas.colaDeSede('CAMPUS');

    expect(total).toBe(2);
    expect(cola.map((c) => [c.posicion, c.id])).toEqual([
      [1, urgente.id],
      [2, 'S-1'],
    ]);
    expect(cola[1]).toMatchObject({ prioridad: 54, minutosEsperando: 2 });
  });

  test('con límite devuelve solo las primeras pero el total completo (valores límite 1 y N)', () => {
    const ctx = armar();
    ['CAM-K-101-VB01', 'CAM-O-101-VB01', 'CAM-H-101-PC01'].forEach((c) => pedirFalla(ctx, c));
    expect(ctx.consultas.colaDeSede('CAMPUS', 1)).toMatchObject({ total: 3, items: [expect.objectContaining({ posicion: 1 })] });
    expect(ctx.consultas.colaDeSede('CAMPUS', 3).items).toHaveLength(3);
    expect(ctx.consultas.colaDeSede('CAMPUS', 10).items).toHaveLength(3);
  });

  test('el docente ve su posición en la cola', () => {
    const ctx = armar();
    pedirFalla(ctx);
    const segunda = pedirFalla(ctx, 'CAM-O-101-VB01');
    expect(ctx.consultas.estadoSolicitud(segunda.id).posicionEnCola).toBe(2);
  });

  describe('quién puede ver el detalle de una solicitud (Enfoque administrativo)', () => {
    // Clases de equivalencia sobre quien pregunta, con una solicitud de "docente" en el CAMPUS asignada a Laura.
    test.each([
      ['quien la creó', { usuario: 'docente', rol: 'DOCENTE', sede: 'CAMPUS' }],
      ['el técnico asignado', { usuario: 'laura', rol: 'TECNICO', sede: 'CAMPUS', tecnicoId: 'T-LAURA' }],
      ['otro técnico de la misma sede', { usuario: 'miguel', rol: 'TECNICO', sede: 'CAMPUS', tecnicoId: 'T-MIGUEL' }],
      ['el coordinador', { usuario: 'admin', rol: 'ADMIN' }],
    ])('la ve %s', (_quien, perfil) => {
      const ctx = armar();
      const s = pedirFalla(ctx);
      expect(ctx.consultas.estadoSolicitud(s.id, perfil).id).toBe(s.id);
    });

    test.each([
      ['una estudiante que no la creó', { usuario: 'estudiante', rol: 'ESTUDIANTE', sede: 'CAMPUS' }],
      ['otro docente de la misma sede', { usuario: 'otro.docente', rol: 'DOCENTE', sede: 'CAMPUS' }],
      ['un técnico de otra sede', { usuario: 'andres', rol: 'TECNICO', sede: 'NORTE', tecnicoId: 'T-ANDRES' }],
    ])('NO la ve %s (AccesoDenegado → 403)', (_quien, perfil) => {
      const ctx = armar();
      const s = pedirFalla(ctx);
      expect(() => ctx.consultas.estadoSolicitud(s.id, perfil)).toThrow(AccesoDenegado);
    });
  });

  test('una solicitud inexistente da NoEncontrado', () => {
    expect(() => armar().consultas.estadoSolicitud('S-X')).toThrow(NoEncontrado);
    expect(() => armar().consultas.panelTecnico('T-X')).toThrow(NoEncontrado);
  });

  test('el panel del técnico incluye su solicitud actual y la cola de su sede', () => {
    const ctx = armar({ tecnicos: [f.nuevoTecnico('T-LAURA', 'CAMPUS', 'Edificio K')] });
    const s = pedirFalla(ctx);
    pedirFalla(ctx, 'CAM-O-101-VB01');

    const panel = ctx.consultas.panelTecnico('T-LAURA');

    expect(panel.solicitudActual.id).toBe(s.id);
    expect(panel.colaSede.total).toBe(1);
  });

  test('la demanda por sede calcula déficit, tiempos y edificios más demandados', () => {
    const ctx = armar({ tecnicos: [f.nuevoTecnico('T-LAURA', 'CAMPUS', 'Edificio K'), f.nuevoTecnico('T-ANDRES', 'NORTE', 'Bloque A')] });
    pedirFalla(ctx); // asignada a Laura
    pedirFalla(ctx, 'CAM-O-101-VB01'); // en cola
    pedirFalla(ctx, 'CAM-O-101-VB01'); // en cola
    ctx.reloj.avanzarMinutos(3);
    ctx.atender.aceptar('T-LAURA');
    ctx.atender.confirmarLlegada('T-LAURA');
    ctx.atender.finalizar('T-LAURA'); // toma una de la cola a los 3 min

    const [campus, norte] = ctx.consultas.demandaPorSede();

    expect(campus).toMatchObject({
      sede: 'CAMPUS',
      enCola: 1,
      enAtencion: 1,
      resueltas24h: 1,
      tecnicosTotal: 1,
      tecnicosDisponibles: 0,
      deficitTecnicos: 1,
      minutosPromedioAsignacion: 1.5,
      minutosPromedioResolucion: 3,
    });
    expect(campus.demandaPorEdificio[0]).toEqual({ edificio: 'Edificio O', total: 2 });
    expect(norte).toMatchObject({ sede: 'NORTE', enCola: 0, deficitTecnicos: 0, minutosPromedioAsignacion: null });
  });
});

describe('Autenticar', () => {
  const usuario = { usuario: 'laura', nombre: 'Laura', rol: 'TECNICO', sede: 'CAMPUS', tecnicoId: 'T-LAURA', hashClave: 'h' };
  const armarAuth = (claveOk) => {
    const credenciales = { verificarClave: jest.fn().mockReturnValue(claveOk), emitirToken: jest.fn().mockReturnValue('TOKEN') };
    const repoUsuarios = { buscarPorUsuario: jest.fn((u) => (u === 'laura' ? usuario : null)) };
    return { caso: new Autenticar({ repoUsuarios, credenciales }), credenciales, repoUsuarios };
  };

  test('con clave correcta devuelve token y perfil sin el hash', () => {
    const { caso, credenciales } = armarAuth(true);
    const r = caso.ejecutar({ usuario: '  LAURA ', clave: 'x' });
    expect(r.token).toBe('TOKEN');
    expect(r.perfil).not.toHaveProperty('hashClave');
    expect(credenciales.emitirToken).toHaveBeenCalledWith(expect.objectContaining({ rol: 'TECNICO', tecnicoId: 'T-LAURA' }));
  });

  test.each([
    [{ usuario: 'laura', clave: 'mala' }, false, AccesoDenegado],
    [{ usuario: 'nadie', clave: 'x' }, true, AccesoDenegado],
    [{ usuario: '', clave: 'x' }, true, DatoInvalido],
    [{ usuario: 'laura' }, true, DatoInvalido],
  ])('rechaza %o', (datos, claveOk, Error) => {
    expect(() => armarAuth(claveOk).caso.ejecutar(datos)).toThrow(Error);
  });
});
