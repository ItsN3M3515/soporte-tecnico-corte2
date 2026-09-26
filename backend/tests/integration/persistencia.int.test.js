const { abrirBaseDatos } = require('../../src/adapters/out/persistence/sqlite/baseDatos');
const {
  RepositorioSolicitudesSqlite,
  RepositorioTecnicosSqlite,
  RepositorioEquiposSqlite,
  UnidadDeTrabajoSqlite,
} = require('../../src/adapters/out/persistence/sqlite/repositorios');
const { Tecnico } = require('../../src/domain/tecnicos/Tecnico');
const { Solicitud } = require('../../src/domain/modelo/Solicitud');
const { ConflictoConcurrencia } = require('../../src/domain/errores');

/**
 * Integración: frontera PUERTO de repositorio ↔ ADAPTADOR SQLite con una BD
 * real embebida (':memory:'). Nada simulado.
 */
describe('Adaptadores de persistencia SQLite', () => {
  let db;
  let solicitudes;
  let tecnicos;
  let uow;

  beforeEach(() => {
    db = abrirBaseDatos(':memory:');
    solicitudes = new RepositorioSolicitudesSqlite(db);
    tecnicos = new RepositorioTecnicosSqlite(db);
    uow = new UnidadDeTrabajoSqlite(db);
    const equipos = new RepositorioEquiposSqlite(db);
    equipos.guardar({ codigo: 'CAM-K-101-VB01', descripcion: 'VB', salon: '101', edificio: 'Edificio K', sede: 'CAMPUS' });
    equipos.guardar({ codigo: 'NOR-BA-101-VB01', descripcion: 'VB', salon: '101', edificio: 'Bloque A', sede: 'NORTE' });
  });

  afterEach(() => db.close());

  const solicitud = (id, extra = {}) =>
    new Solicitud({ id, codigoEquipo: 'CAM-K-101-VB01', salon: '101', edificio: 'Edificio K', sede: 'CAMPUS', tipo: 'FALLA_EQUIPO_FIJO', claseEnCurso: true, creadaEn: 1000, ...extra });

  test('guarda y rehidrata un técnico con su estado (State se reconstruye desde la BD)', () => {
    const laura = new Tecnico({ id: 'T1', nombre: 'Laura', sede: 'CAMPUS', edificioBase: 'Edificio K' });
    tecnicos.guardar(laura);
    const s = solicitud('S1');
    solicitudes.guardar(s);

    const leida = tecnicos.buscarPorId('T1');
    leida.asignar(s, 2000);
    tecnicos.guardar(leida);
    solicitudes.guardar(s);

    const otraVez = tecnicos.buscarPorId('T1');
    expect(otraVez.nombreEstado).toBe('ASIGNADO');
    expect(otraVez.estaEsperandoRespuesta()).toBe(true);
    expect(otraVez.version).toBe(1);
    expect(solicitudes.buscarPorId('S1')).toMatchObject({ estado: 'ASIGNADA', tecnicoId: 'T1', asignadaEn: 2000, claseEnCurso: true });
  });

  test('bloqueo optimista: dos operaciones que leyeron la misma versión no pueden ganar ambas', () => {
    tecnicos.guardar(new Tecnico({ id: 'T1', nombre: 'Laura', sede: 'CAMPUS', edificioBase: 'Edificio K' }));
    solicitudes.guardar(solicitud('S1'));
    solicitudes.guardar(solicitud('S2'));
    // dos "instancias" leen al técnico disponible al mismo tiempo
    const copiaA = tecnicos.buscarPorId('T1');
    const copiaB = tecnicos.buscarPorId('T1');

    copiaA.asignar(solicitud('S1'), 1);
    tecnicos.guardar(copiaA);
    copiaB.asignar(solicitud('S2'), 1);

    expect(() => tecnicos.guardar(copiaB)).toThrow(ConflictoConcurrencia);
    expect(tecnicos.buscarPorId('T1').solicitudActualId).toBe('S1');
  });

  test('la unidad de trabajo revierte todo si algo falla a mitad de camino', () => {
    expect(() =>
      uow.ejecutar(() => {
        solicitudes.guardar(solicitud('S1'));
        throw new Error('falla simulada');
      }),
    ).toThrow('falla simulada');
    expect(solicitudes.buscarPorId('S1')).toBeNull();
  });

  test('listarAbiertas filtra por sede y excluye las resueltas', () => {
    solicitudes.guardar(solicitud('S1'));
    solicitudes.guardar(solicitud('S2', { estado: 'RESUELTA' }));
    solicitudes.guardar(solicitud('S3', { codigoEquipo: 'NOR-BA-101-VB01', salon: '101', edificio: 'Bloque A', sede: 'NORTE' }));

    expect(solicitudes.listarAbiertas({ sede: 'CAMPUS' }).map((s) => s.id)).toEqual(['S1']);
    expect(solicitudes.listarAbiertas({}).map((s) => s.id).sort()).toEqual(['S1', 'S3']);
    expect(solicitudes.listarDesde(0)).toHaveLength(3);
    expect(solicitudes.listarDesde(1001)).toHaveLength(0);
  });

  test('la BD rechaza una solicitud de un equipo que no existe (integridad referencial)', () => {
    expect(() => solicitudes.guardar(solicitud('S9', { codigoEquipo: 'NO-EXISTE-1' }))).toThrow(/FOREIGN KEY/);
  });
});
