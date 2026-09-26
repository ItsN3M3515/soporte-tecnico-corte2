const { CrearSolicitud } = require('../../../src/application/CrearSolicitud');
const { AtenderSolicitud } = require('../../../src/application/AtenderSolicitud');
const { AsignarManualmente } = require('../../../src/application/AsignarManualmente');
const { ActivarProgramadas } = require('../../../src/application/ActivarProgramadas');
const { EscalarVencidas } = require('../../../src/application/EscalarVencidas');
const { Consultas } = require('../../../src/application/Consultas');
const { NotificacionesDocente } = require('../../../src/application/NotificacionesDocente');
const { FabricaSolicitudes } = require('../../../src/domain/modelo/FabricaSolicitudes');
const { GestorAsignaciones } = require('../../../src/domain/asignacion/GestorAsignaciones');
const { PoliticaImpactoYEspera } = require('../../../src/domain/prioridad/politicas');
const { BusquedaPorEdificio, FallbackCercaniaDecorator, CualquieraDeLaSedeDecorator, MapaCercania } = require('../../../src/domain/busqueda/busqueda');
const { construirCadenaEscalacion } = require('../../../src/domain/escalacion/cadena');
const { NoEncontrado, DatoInvalido, TransicionInvalida } = require('../../../src/domain/errores');
const f = require('../../dobles/fakes');

/**
 * Casos de uso que agregó el prototipo AsisTec (Figma). Mismos dobles que CasosDeUso.test.js:
 * repos en memoria, reloj falso y un publicador espía DETRÁS del decorador de notificaciones,
 * para verificar a la vez los eventos en tiempo real y los avisos que recibe el docente.
 */
const MIN = 60000;

function armar({ tecnicos = [] } = {}) {
  let n = 0;
  const reloj = new f.RelojFalso();
  const espia = { publicar: jest.fn() };
  const repoSolicitudes = new f.RepoSolicitudesFake();
  const repoTecnicos = new f.RepoTecnicosFake(tecnicos);
  const repoEquipos = new f.RepoEquiposFake(f.EQUIPOS);
  const repoNotificaciones = new f.RepoNotificacionesFake();
  const busqueda = new CualquieraDeLaSedeDecorator(
    new FallbackCercaniaDecorator(new BusquedaPorEdificio(), new MapaCercania({ 'Edificio O': ['Edificio K'] })),
  );
  const gestor = new GestorAsignaciones({ busqueda, politicaPrioridad: new PoliticaImpactoYEspera() });
  const notificaciones = new NotificacionesDocente({
    publicador: espia, repoNotificaciones, repoTecnicos, reloj, generadorId: () => `N-${(n += 1)}`, log: { error: jest.fn() },
  });
  const base = { repoSolicitudes, repoTecnicos, repoEquipos, unidadDeTrabajo: f.unidadDeTrabajoDirecta, gestor, publicador: notificaciones, reloj };
  return {
    ...base,
    espia,
    repoNotificaciones,
    notificaciones,
    crear: new CrearSolicitud({ ...base, fabrica: new FabricaSolicitudes(() => `S-${(n += 1)}`) }),
    atender: new AtenderSolicitud(base),
    asignarManual: new AsignarManualmente(base),
    activar: new ActivarProgramadas({ ...base, minutosAnticipacion: 30 }),
    escalar: new EscalarVencidas({ ...base, cadena: construirCadenaEscalacion(gestor), minutosSinRespuesta: 5, minutosEnCola: 10 }),
    consultas: new Consultas(base),
  };
}

const pedirFalla = (ctx, usuario = 'docente') =>
  ctx.crear.ejecutar({ qr: 'SOPORTE:v1:CAM-K-101-VB01', tipo: 'FALLA_EQUIPO_FIJO', usuario });
const pedirPrestamo = (ctx, extra = {}) =>
  ctx.crear.ejecutar({ ubicacion: { edificio: 'Edificio O', salon: '101' }, tipo: 'PRESTAMO_EQUIPO', datos: { recurso: 'PORTATIL' }, usuario: 'docente', ...extra });
const eventos = (espia) => espia.publicar.mock.calls.map(([evento]) => evento);

describe('CrearSolicitud — las tres formas de indicar el lugar', () => {
  test('por salón (préstamo): la sede sale del registro, no del cliente', () => {
    const ctx = armar();
    const v = pedirPrestamo(ctx, { ubicacion: { edificio: 'Edificio O', salon: '101', sede: 'NORTE' } });
    expect(v).toMatchObject({ sede: 'CAMPUS', edificio: 'Edificio O', salon: '101', codigoEquipo: null, titulo: 'Préstamo de PC' });
  });

  test('búsqueda manual (QR dañado): con el código del equipo elegido en la lista', () => {
    const ctx = armar();
    const v = ctx.crear.ejecutar({ codigoEquipo: 'cam-o-101-pc01', tipo: 'FALLA_EQUIPO_FIJO', usuario: 'docente' });
    expect(v).toMatchObject({ codigoEquipo: 'CAM-O-101-PC01', titulo: 'PC de salón', salon: '101' });
  });

  test.each([
    ['un salón que no existe', { ubicacion: { edificio: 'Edificio O', salon: '999' } }, NoEncontrado],
    ['un edificio vacío', { ubicacion: { edificio: '', salon: '101' } }, DatoInvalido],
    ['sin QR, sin equipo y sin salón', {}, DatoInvalido],
    ['un código manual con caracteres raros', { codigoEquipo: 'CAM O 101' }, DatoInvalido],
  ])('%s se rechaza y no guarda nada', (_caso, entrada, Error) => {
    const ctx = armar();
    expect(() => ctx.crear.ejecutar({ tipo: 'PRESTAMO_EQUIPO', datos: { recurso: 'PORTATIL' }, usuario: 'docente', ...entrada })).toThrow(Error);
    expect(ctx.repoSolicitudes.listarAbiertas({})).toHaveLength(0);
  });

  test('una agendada NO toma técnico aunque haya uno libre', () => {
    const ctx = armar({ tecnicos: [f.nuevoTecnico('T-LAURA', 'CAMPUS', 'Edificio K')] });
    const v = pedirPrestamo(ctx, { programadaPara: ctx.reloj.ahora() + 120 * MIN });
    expect(v.estado).toBe('PROGRAMADA');
    expect(ctx.repoTecnicos.buscarPorId('T-LAURA').nombreEstado).toBe('DISPONIBLE');
  });
});

describe('ActivarProgramadas (agenda → cola de prioridades)', () => {
  test('entra a la cola 30 min antes de la hora pedida, no antes', () => {
    const ctx = armar({ tecnicos: [f.nuevoTecnico('T-LAURA', 'CAMPUS', 'Edificio K')] });
    const v = pedirPrestamo(ctx, { programadaPara: ctx.reloj.ahora() + 60 * MIN });

    ctx.reloj.avanzarMinutos(29);
    expect(ctx.activar.ejecutar()).toEqual([]);

    ctx.reloj.avanzarMinutos(1);
    expect(ctx.activar.ejecutar()).toEqual([{ id: v.id, accion: 'ACTIVADA_Y_ASIGNADA' }]);
    expect(ctx.repoSolicitudes.buscarPorId(v.id)).toMatchObject({ estado: 'ASIGNADA', tecnicoId: 'T-LAURA' });
    expect(eventos(ctx.espia)).toEqual(expect.arrayContaining(['solicitud:activada', 'solicitud:asignada']));
  });

  test('sin técnicos queda PENDIENTE y su espera cuenta desde la activación', () => {
    const ctx = armar();
    const v = pedirPrestamo(ctx, { programadaPara: ctx.reloj.ahora() + 10 * MIN });
    expect(ctx.activar.ejecutar()).toEqual([{ id: v.id, accion: 'ACTIVADA' }]);

    ctx.reloj.avanzarMinutos(9);
    expect(ctx.escalar.ejecutar()).toEqual([]); // aún no cumple 10 min en cola
  });
});

describe('AtenderSolicitud.cancelar (botón "Cancelar" del técnico)', () => {
  test('la solicitud pasa a otro técnico de la sede y avisa a ambos', () => {
    const ctx = armar({ tecnicos: [f.nuevoTecnico('T-LAURA', 'CAMPUS', 'Edificio K'), f.nuevoTecnico('T-SOFIA', 'CAMPUS', 'Edificio H')] });
    const v = pedirFalla(ctx);
    ctx.atender.aceptar('T-LAURA');

    const r = ctx.atender.cancelar('T-LAURA');

    expect(r.nuevoTecnico.id).toBe('T-SOFIA');
    expect(ctx.repoSolicitudes.buscarPorId(v.id)).toMatchObject({ estado: 'ASIGNADA', tecnicoId: 'T-SOFIA' });
    expect(ctx.repoTecnicos.buscarPorId('T-LAURA').nombreEstado).toBe('DISPONIBLE');
    const destinos = ctx.espia.publicar.mock.calls.filter(([e]) => e === 'solicitud:devuelta').flatMap(([, , d]) => d);
    expect(destinos).toContain('tecnico:T-LAURA');
  });

  test('si no hay nadie más, vuelve a la cola (nunca se reasigna al mismo que canceló)', () => {
    const ctx = armar({ tecnicos: [f.nuevoTecnico('T-LAURA', 'CAMPUS', 'Edificio K')] });
    const v = pedirFalla(ctx);
    expect(ctx.atender.cancelar('T-LAURA').nuevoTecnico).toBeNull();
    expect(ctx.repoSolicitudes.buscarPorId(v.id)).toMatchObject({ estado: 'PENDIENTE', tecnicoId: null });
  });
});

describe('AsignarManualmente (panel del coordinador)', () => {
  test('puede mandar un técnico de OTRA sede a una solicitud escalada (redistribución multisede)', () => {
    const ctx = armar({ tecnicos: [f.nuevoTecnico('T-ANDRES', 'NORTE', 'Bloque A')] });
    const v = pedirFalla(ctx);
    ctx.reloj.avanzarMinutos(10);
    ctx.escalar.ejecutar();

    const r = ctx.asignarManual.ejecutar({ solicitudId: v.id, tecnicoId: 'T-ANDRES' });

    expect(r).toMatchObject({ estado: 'ASIGNADA', tecnicoId: 'T-ANDRES', sede: 'CAMPUS' });
    const [, , destinos] = ctx.espia.publicar.mock.calls.find(([e, d]) => e === 'solicitud:asignada' && d.id === v.id);
    expect(destinos).toEqual(expect.arrayContaining(['tecnico:T-ANDRES', 'sede:CAMPUS', 'sede:NORTE', 'usuario:docente']));
  });

  test('un técnico ocupado no se puede asignar (lo impide el patrón State)', () => {
    const ctx = armar({ tecnicos: [f.nuevoTecnico('T-LAURA', 'CAMPUS', 'Edificio K')] });
    pedirFalla(ctx);
    const otra = pedirPrestamo(ctx);
    expect(() => ctx.asignarManual.ejecutar({ solicitudId: otra.id, tecnicoId: 'T-LAURA' })).toThrow(TransicionInvalida);
  });

  test.each([
    ['solicitud', { solicitudId: 'S-NO', tecnicoId: 'T-LAURA' }],
    ['técnico', { solicitudId: 'S-1', tecnicoId: 'T-NO' }],
  ])('%s inexistente → NoEncontrado', (_q, entrada) => {
    const ctx = armar({ tecnicos: [f.nuevoTecnico('T-LAURA', 'CAMPUS', 'Edificio K')] });
    pedirPrestamo(ctx);
    expect(() => ctx.asignarManual.ejecutar(entrada)).toThrow(NoEncontrado);
  });
});

describe('EscalarVencidas — motivo visible para el coordinador', () => {
  test.each([
    ['nadie en la sede', [], 'Sin técnicos disponibles cercanos', 10],
    ['el técnico no respondió', [f.nuevoTecnico('T-LAURA', 'CAMPUS', 'Edificio K')], 'Técnico asignado no respondió en 5 min', 5],
  ])('%s', (_caso, tecnicos, motivo, minutos) => {
    const ctx = armar({ tecnicos });
    const v = pedirFalla(ctx);
    ctx.reloj.avanzarMinutos(minutos);
    ctx.escalar.ejecutar();
    expect(ctx.consultas.escaladas()).toEqual([expect.objectContaining({ id: v.id, motivoEscalacion: motivo, minutosEsperando: minutos })]);
  });
});

describe('Consultas del prototipo', () => {
  test('"Mis solicitudes": activas con su técnico, historial aparte y solo las propias', () => {
    const ctx = armar({ tecnicos: [f.nuevoTecnico('T-LAURA', 'CAMPUS', 'Edificio K')] });
    const falla = pedirFalla(ctx);
    ctx.reloj.avanzarMinutos(1);
    ctx.atender.aceptar('T-LAURA');
    ctx.atender.confirmarLlegada('T-LAURA');
    ctx.atender.finalizar('T-LAURA');
    ctx.reloj.avanzarMinutos(1);
    const prestamo = pedirPrestamo(ctx);
    pedirFalla(ctx, 'otro.docente');

    const mias = ctx.consultas.misSolicitudes('docente');

    expect(mias.activas.map((s) => s.id)).toEqual([prestamo.id]);
    expect(mias.activas[0].tecnico).toMatchObject({ id: 'T-LAURA' });
    expect(mias.historial.map((s) => [s.id, s.estado])).toEqual([[falla.id, 'RESUELTA']]);
  });

  test('"hoy" en el panel es el día en Bogotá (UTC-5): lo resuelto antes de la medianoche local no cuenta', () => {
    const ctx = armar({ tecnicos: [f.nuevoTecnico('T-LAURA', 'CAMPUS', 'Edificio K')] });
    ctx.reloj.t = Date.UTC(2026, 8, 23, 4, 30); // 11:30 p. m. del 22 en Bogotá
    pedirFalla(ctx);
    ctx.atender.aceptar('T-LAURA');
    ctx.atender.confirmarLlegada('T-LAURA');
    ctx.reloj.avanzarMinutos(20); // 11:50 p. m.
    ctx.atender.finalizar('T-LAURA');
    expect(ctx.consultas.resumenHoy()).toMatchObject({ resueltasHoy: 1, minutosPromedioResolucion: 20 });

    ctx.reloj.avanzarMinutos(20); // 12:10 a. m. del 23: día nuevo
    expect(ctx.consultas.resumenHoy()).toMatchObject({ resueltasHoy: 0, escaladasHoy: 0, minutosPromedioResolucion: null });
  });

  test('ubicaciones agrupa sede → edificio → salones sin repetir', () => {
    const ctx = armar();
    const campus = ctx.consultas.ubicaciones().find((u) => u.sede === 'CAMPUS');
    expect(campus.edificios.find((e) => e.edificio === 'Edificio O').salones).toEqual(['101']);
  });

  test('búsqueda manual: lista los equipos del salón o dice que no hay', () => {
    const ctx = armar();
    expect(ctx.consultas.equiposDeSalon('Edificio O', '101').map((e) => e.codigo)).toEqual(['CAM-O-101-VB01', 'CAM-O-101-PC01']);
    expect(() => ctx.consultas.equiposDeSalon('Edificio O', '999')).toThrow(NoEncontrado);
  });

  test('seguimiento: incluye el técnico con su estado (para el paso "En camino")', () => {
    const ctx = armar({ tecnicos: [f.nuevoTecnico('T-LAURA', 'CAMPUS', 'Edificio K')] });
    const v = pedirFalla(ctx);
    ctx.atender.aceptar('T-LAURA');
    expect(ctx.consultas.estadoSolicitud(v.id).tecnico).toMatchObject({ id: 'T-LAURA', estado: 'EN_CAMINO' });
  });
});

describe('NotificacionesDocente (Decorator del publicador)', () => {
  test('cada cambio de SU solicitud le llega al docente como aviso y en su sala', () => {
    const ctx = armar({ tecnicos: [f.nuevoTecnico('T-LAURA', 'CAMPUS', 'Edificio K')] });
    pedirFalla(ctx);
    ctx.atender.aceptar('T-LAURA');
    ctx.atender.confirmarLlegada('T-LAURA');
    ctx.atender.finalizar('T-LAURA');

    const { items, noLeidas } = ctx.notificaciones.listar('docente');

    expect(items.map((n) => n.titulo)).toEqual(['Solicitud resuelta', 'Técnico en el salón', 'Técnico asignado', 'Actualización de estado']);
    expect(items[2].mensaje).toBe('T-LAURA va en camino a Salón 101');
    expect(noLeidas).toBe(4);
    expect(ctx.espia.publicar).toHaveBeenCalledWith('notificacion:nueva', expect.any(Object), ['usuario:docente']);
    expect(ctx.notificaciones.marcarLeidas('docente')).toEqual({ marcadas: 4 });
    expect(ctx.notificaciones.listar('docente').noLeidas).toBe(0);
  });

  test('si guardar el aviso falla, la operación principal NO se cae', () => {
    const ctx = armar();
    ctx.repoNotificaciones.guardar = () => {
      throw new Error('disco lleno');
    };
    expect(() => pedirPrestamo(ctx)).not.toThrow();
    expect(ctx.repoSolicitudes.listarAbiertas({})).toHaveLength(1);
    expect(ctx.notificaciones.log.error).toHaveBeenCalled();
  });

  test('eventos sin docente (p. ej. notificacion:nueva) pasan tal cual, sin sala extra', () => {
    const ctx = armar();
    ctx.notificaciones.publicar('otro:evento', { creadaPor: 'docente' }, ['admin']);
    expect(ctx.espia.publicar).toHaveBeenCalledWith('otro:evento', { creadaPor: 'docente' }, ['admin']);
    expect(ctx.repoNotificaciones.datos).toHaveLength(0);
  });

  test('el auditorio se nombra tal cual (no "Salón Auditorio")', () => {
    const ctx = armar();
    ctx.notificaciones.publicar('solicitud:resuelta', { id: 'S-1', creadaPor: 'docente', salon: 'Auditorio', titulo: 'Feria' });
    expect(ctx.repoNotificaciones.datos[0].mensaje).toBe('Feria en Auditorio completado');
  });
});
