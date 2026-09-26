const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { DatabaseSync } = require('node:sqlite');
const { io: conectar } = require('socket.io-client');
const { crearEntorno } = require('./entorno');
const { crearServidorSockets } = require('../../src/adapters/in/realtime/servidorSockets');
const { abrirBaseDatos, VERSION_ESQUEMA } = require('../../src/adapters/out/persistence/sqlite/baseDatos');
const { RepositorioSolicitudesSqlite, RepositorioNotificacionesSqlite } = require('../../src/adapters/out/persistence/sqlite/repositorios');
const { Solicitud } = require('../../src/domain/modelo/Solicitud');

/**
 * INTEGRACIÓN de los flujos del prototipo AsisTec (Figma) con el sistema REAL:
 * Express + casos de uso + SQLite en memoria (+ Socket.IO en la última sección).
 * Cada `describe` corresponde a una o más pantallas del prototipo.
 */
const HORA = 60 * 60 * 1000;

describe('API del prototipo AsisTec', () => {
  let e;
  beforeEach(() => {
    e = crearEntorno();
  });

  test('pantalla 1 → login devuelve nombre y correo para "Mi perfil"', async () => {
    const res = await e.api.post('/api/auth/login').send({ usuario: 'docente', clave: 'docente123' });
    expect(res.body.perfil).toMatchObject({ nombre: 'Amy Jeanine', correo: 'amy.jeanine@unisabana.edu.co', rol: 'DOCENTE' });
  });

  describe('estudiantes: también reservan y reportan, igual que los docentes', () => {
    test('una estudiante reserva un PC por QR y lo ve en "Mis solicitudes"; la docente no lo ve en las suyas', async () => {
      const login = await e.api.post('/api/auth/login').send({ usuario: 'estudiante', clave: 'estudiante123' });
      expect(login.body.perfil).toMatchObject({ rol: 'ESTUDIANTE', nombre: 'Valentina Rojas', sede: 'CAMPUS' });

      const res = await e.pedir('CAM-H-201-PC01', { tipo: 'PRESTAMO_EQUIPO', datos: { recurso: 'PORTATIL', cantidad: 1 } }, 'estudiante');
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ creadaPor: 'estudiante', titulo: 'Préstamo de PC', salon: '201', edificio: 'Edificio H' });

      const suyas = (await e.como('estudiante').get('/api/solicitudes/mias')).body;
      const deLaDocente = (await e.como('docente').get('/api/solicitudes/mias')).body;
      expect(suyas.activas.map((s) => s.id)).toEqual([res.body.id]);
      expect(deLaDocente.activas).toEqual([]);
    });

    test('cada cuenta ve solo el detalle de SUS solicitudes: la docente no abre el seguimiento de la estudiante (403)', async () => {
      const res = await e.pedir('CAM-H-201-PC01', { tipo: 'PRESTAMO_EQUIPO', datos: { recurso: 'PORTATIL', cantidad: 1 } }, 'estudiante');
      const url = `/api/solicitudes/${res.body.id}`;
      expect((await e.como('estudiante').get(url)).status).toBe(200);
      expect((await e.como('admin').get(url)).status).toBe(200);
      const ajena = await e.como('docente').get(url);
      expect(ajena.status).toBe(403);
      expect(ajena.body.codigo).toBe('ACCESO_DENEGADO');
    });

    test.each([
      ['get', '/api/admin/resumen'],
      ['post', '/api/tecnicos/yo/aceptar'],
    ])('una estudiante no entra a %s %s (403)', async (metodo, url) => {
      expect((await e.como('estudiante')[metodo](url, {})).status).toBe(403);
    });
  });

  describe('pantalla 3a: "Buscar manualmente por edificio y salón" (QR dañado)', () => {
    test('ubicaciones → equipos del salón → solicitud con el equipo elegido', async () => {
      const ubicaciones = (await e.como('docente').get('/api/ubicaciones')).body;
      const edificioO = ubicaciones.find((u) => u.sede === 'CAMPUS').edificios.find((x) => x.edificio === 'Edificio O');
      expect(edificioO.salones).toEqual(['101', '102', '201', '202', '301']);

      const equipos = (await e.como('docente').get('/api/equipos?edificio=Edificio%20O&salon=301')).body;
      expect(equipos.map((x) => x.descripcion)).toEqual(['PC de salón', 'Video Beam']);

      const vb = equipos.find((x) => x.descripcion === 'Video Beam');
      const res = await e.como('docente').post('/api/solicitudes', { codigoEquipo: vb.codigo, tipo: 'FALLA_EQUIPO_FIJO' });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ id: 'S-0001', titulo: 'Video Beam', salon: '301', edificio: 'Edificio O', estado: 'ASIGNADA' });
    });

    test.each([
      ['/api/equipos?edificio=Edificio%20O&salon=999', 404],
      ['/api/equipos?edificio=Edificio%20O', 400],
    ])('%s → %i', async (url, status) => {
      expect((await e.como('docente').get(url)).status).toBe(status);
    });
  });

  describe('pantallas 3b/3c: préstamo ahora y agendado', () => {
    const prestamo = (extra) => ({
      tipo: 'PRESTAMO_EQUIPO',
      ubicacion: { edificio: 'Edificio K', salon: '201' },
      datos: { recurso: 'PORTATIL', cantidad: 2, requiereInternet: true, requiereSoftware: true, software: 'Autodesk' },
      ...extra,
    });

    test('ahora → asignado; agendado → PROGRAMADA y entra a la cola 30 min antes', async () => {
      const ahora = (await e.como('docente').post('/api/solicitudes', prestamo())).body;
      expect(ahora).toMatchObject({ estado: 'ASIGNADA', titulo: 'Préstamo de 2 PC', datos: { software: 'Autodesk' } });

      const agendado = (await e.como('docente').post('/api/solicitudes', prestamo({ programadaPara: e.reloj.ahora() + 2 * HORA }))).body;
      expect(agendado.estado).toBe('PROGRAMADA');

      e.reloj.avanzarMinutos(90);
      e.contenedor.activarProgramadas.ejecutar();
      const despues = (await e.como('docente').get(`/api/solicitudes/${agendado.id}`)).body;
      expect(['PENDIENTE', 'ASIGNADA']).toContain(despues.estado);
    });

    test('datos inválidos → 400 con el mensaje para mostrar en la app', async () => {
      const res = await e.como('docente').post('/api/solicitudes', prestamo({ datos: { recurso: 'PORTATIL', cantidad: 50 } }));
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/cantidad de equipos/);
    });
  });

  test('pantallas 12, 13 y 14: mantenimiento, evento en el auditorio y falla eléctrica', async () => {
    const manana = e.reloj.ahora() + 24 * HORA;
    const pedir = (body) => e.como('docente').post('/api/solicitudes', body);

    const mant = await pedir({ tipo: 'MANTENIMIENTO', ubicacion: { edificio: 'Ad Portas', salon: '101' }, datos: { tipoRevision: 'GENERAL' }, programadaPara: manana });
    const evento = await pedir({
      tipo: 'SOPORTE_EVENTO', ubicacion: { edificio: 'Ad Portas', salon: 'Auditorio' },
      datos: { nombreEvento: 'Semana de la Ingeniería', requerimientos: ['VIDEO_BEAM_EXTRA'] }, programadaPara: manana,
    });
    const electrica = await pedir({ tipo: 'FALLA_ELECTRICA', ubicacion: { edificio: 'Edificio K', salon: '204' }, datos: { tipoFalla: 'SIN_ENERGIA' } });

    expect([mant.status, mant.body.estado]).toEqual([201, 'PROGRAMADA']);
    expect([evento.status, evento.body.titulo]).toEqual([201, 'Semana de la Ingeniería']);
    expect(electrica.status).toBe(404); // el Edificio K no tiene salón 204 en los datos de ejemplo
  });

  test('pantalla 8 "Mis solicitudes" y pantalla 11 "Notificaciones"', async () => {
    const falla = (await e.pedir('CAM-O-301-VB01')).body;
    await e.como('laura').post('/api/tecnicos/yo/aceptar');

    const mias = (await e.como('docente').get('/api/solicitudes/mias')).body;
    expect(mias.activas).toEqual([expect.objectContaining({ id: falla.id, tecnico: expect.objectContaining({ nombre: 'Laura Martínez', estado: 'EN_CAMINO' }) })]);
    expect((await e.como('docente.norte').get('/api/solicitudes/mias')).body).toEqual({ activas: [], historial: [] });

    const notif = (await e.como('docente').get('/api/notificaciones')).body;
    expect(notif.items[0]).toMatchObject({ titulo: 'Técnico asignado', mensaje: 'Laura va en camino a Salón 301', leida: false });
    await e.como('docente').post('/api/notificaciones/leidas');
    expect((await e.como('docente').get('/api/notificaciones')).body.noLeidas).toBe(0);
  });

  test('pantalla 5: "Cancelar" pasa la solicitud a otro técnico', async () => {
    await e.pedir('CAM-K-101-VB01');
    const res = await e.como('laura').post('/api/tecnicos/yo/cancelar');
    expect(res.status).toBe(200);
    expect(res.body.nuevoTecnico).not.toBeNull();
    expect(res.body.nuevoTecnico.id).not.toBe('T-LAURA');
  });

  test('pantalla 6: tarjetas del día, escaladas con motivo y "Asignar manualmente" con un técnico de otra sede', async () => {
    for (const salon of ['101', '102', '201', '202']) await e.pedir(`CAM-O-${salon}-VB01`); // 3 técnicos del campus + 1 en cola
    for (const tecnico of ['laura', 'miguel', 'sofia']) await e.como(tecnico).post('/api/tecnicos/yo/aceptar');
    e.reloj.avanzarMinutos(10);
    await e.como('admin').post('/api/admin/escalar');

    const escaladas = (await e.como('admin').get('/api/admin/escaladas')).body;
    expect(escaladas).toHaveLength(1);
    expect(escaladas[0].motivoEscalacion).toBe('Sin técnicos disponibles cercanos');

    const asignada = await e.como('admin').post(`/api/admin/solicitudes/${escaladas[0].id}/asignar`, { tecnicoId: 'T-ANDRES' });
    expect(asignada.body).toMatchObject({ estado: 'ASIGNADA', tecnicoId: 'T-ANDRES', sede: 'CAMPUS' });

    const resumen = (await e.como('admin').get('/api/admin/resumen')).body;
    expect(resumen).toMatchObject({ escaladasHoy: 1, resueltasHoy: 0 });
  });

  test.each([
    ['docente', 'get', '/api/admin/resumen', 403],
    ['docente', 'post', '/api/tecnicos/yo/cancelar', 403],
    ['admin', 'post', '/api/admin/solicitudes/S-0001/asignar', 400],
  ])('%s %s %s → %i', async (usuario, metodo, url, status) => {
    expect((await e.como(usuario)[metodo](url, {})).status).toBe(status);
  });
});

describe('Persistencia de los campos nuevos (SQLite real)', () => {
  test('datos JSON, agenda, escalación y equipo opcional sobreviven ida y vuelta', () => {
    const db = abrirBaseDatos(':memory:');
    const repo = new RepositorioSolicitudesSqlite(db);
    const original = new Solicitud({
      id: 'S-0100', salon: 'Auditorio', edificio: 'Ad Portas', sede: 'CAMPUS', tipo: 'SOPORTE_EVENTO',
      datos: { nombreEvento: 'Feria', requerimientos: ['AUDIO'] }, estado: 'PROGRAMADA', creadaPor: 'docente',
      creadaEn: 1000, programadaPara: 5000,
    });
    repo.guardar(original);
    original.activar(4000);
    original.escalar(4500, 'Sin técnicos disponibles cercanos');
    repo.guardar(original);

    const leida = repo.buscarPorId('S-0100');
    expect(leida).toMatchObject({
      codigoEquipo: null, datos: { nombreEvento: 'Feria', requerimientos: ['AUDIO'] }, programadaPara: 5000,
      activadaEn: 4000, escaladaEn: 4500, motivoEscalacion: 'Sin técnicos disponibles cercanos',
    });
    expect(repo.listarPorCreador('docente', 10)).toHaveLength(1);
    expect(repo.listarConActividadDesde(4500)).toHaveLength(1);
    expect(repo.listarConActividadDesde(4501)).toHaveLength(0);
  });

  test('notificaciones: la más reciente primero y marcar leídas', () => {
    const repo = new RepositorioNotificacionesSqlite(abrirBaseDatos(':memory:'));
    repo.guardar({ id: 'N1', usuario: 'docente', tipo: 'ESTADO', titulo: 'a', mensaje: 'a', creadaEn: 1, leida: false });
    repo.guardar({ id: 'N2', usuario: 'docente', tipo: 'TECNICO', titulo: 'b', mensaje: 'b', creadaEn: 2, leida: false });
    expect(repo.listarPorUsuario('docente', 10).map((n) => n.id)).toEqual(['N2', 'N1']);
    expect(repo.marcarLeidas('docente')).toBe(2);
    expect(repo.listarPorUsuario('docente', 10).every((n) => n.leida)).toBe(true);
  });

  test('una BD de la versión anterior se recrea con el esquema nuevo al abrirla', () => {
    const ruta = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'soporte-')), 'vieja.db');
    const vieja = new DatabaseSync(ruta);
    vieja.exec("CREATE TABLE solicitudes (id TEXT PRIMARY KEY, codigo_equipo TEXT NOT NULL); INSERT INTO solicitudes VALUES ('S-1', 'X');");
    vieja.close();

    const db = abrirBaseDatos(ruta);

    expect(db.prepare('PRAGMA user_version').get().user_version).toBe(VERSION_ESQUEMA);
    expect(db.prepare('SELECT COUNT(*) AS n FROM solicitudes').get().n).toBe(0);
    expect(db.prepare("SELECT COUNT(*) AS n FROM pragma_table_info('solicitudes') WHERE name = 'datos'").get().n).toBe(1);
    db.close();
  });
});

describe('Tiempo real para el docente (seguimiento y notificaciones)', () => {
  let e;
  let servidor;
  let socket;

  beforeEach(async () => {
    e = crearEntorno();
    servidor = http.createServer(e.app);
    crearServidorSockets(servidor, e.contenedor);
    await new Promise((ok) => servidor.listen(0, ok));
  });

  afterEach(async () => {
    socket?.close();
    await new Promise((ok) => servidor.close(ok));
  });

  test('cuando el técnico acepta, al docente le llegan el cambio de estado y el aviso', async () => {
    socket = conectar(`http://localhost:${servidor.address().port}`, { auth: { token: await e.login('docente') }, transports: ['websocket'], forceNew: true });
    const salas = await new Promise((ok) => socket.on('conectado', ok));
    expect(salas.salas).toContain('usuario:docente');

    await e.pedir('CAM-K-101-VB01');
    const aceptada = new Promise((ok) => socket.on('solicitud:aceptada', ok));
    const aviso = new Promise((ok) => socket.on('notificacion:nueva', (n) => n.titulo === 'Técnico asignado' && ok(n)));
    await e.como('laura').post('/api/tecnicos/yo/aceptar');

    expect(await aceptada).toMatchObject({ estado: 'EN_ATENCION', creadaPor: 'docente' });
    expect(await aviso).toMatchObject({ mensaje: 'Laura va en camino a Salón 101' });
  });
});
