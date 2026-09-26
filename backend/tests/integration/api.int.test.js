const { crearEntorno } = require('./entorno');

/**
 * Integración: adaptador HTTP (Express) → casos de uso → dominio → SQLite.
 * Cada prueba usa un entorno nuevo (BD en memoria propia).
 */
describe('API REST', () => {
  let e;

  beforeEach(() => {
    e = crearEntorno();
  });

  describe('seguridad y roles (reto "Enfoque administrativo")', () => {
    test('sin token responde 401', async () => {
      expect((await e.api.post('/api/solicitudes').send({})).status).toBe(401);
      expect((await e.api.get('/api/admin/demanda').set('Authorization', 'Bearer inventado')).status).toBe(401);
    });

    test('login con clave incorrecta responde 403', async () => {
      expect((await e.api.post('/api/auth/login').send({ usuario: 'admin', clave: 'mala' })).status).toBe(403);
    });

    test('un técnico no puede ver el panel administrativo (403)', async () => {
      const res = await e.como('laura').get('/api/admin/demanda');
      expect(res.status).toBe(403);
    });

    test('un docente no puede usar la pantalla del trabajador (403)', async () => {
      expect((await e.como('docente').post('/api/tecnicos/yo/aceptar')).status).toBe(403);
    });

    test('un técnico no puede crear solicitudes (403)', async () => {
      expect((await e.pedir('CAM-K-101-VB01', {}, 'laura')).status).toBe(403);
    });
  });

  describe('solicitud por QR (retos "Reservar mediante QR" y "QR asociado al PC")', () => {
    test('resolver el QR muestra la ubicación registrada del equipo', async () => {
      const res = await e.como('docente').get('/api/qr/resolver?qr=SOPORTE:v1:CAM-O-101-VB01');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ salon: '101', edificio: 'Edificio O', sede: 'CAMPUS' });
    });

    test('crear por QR responde 201 y queda asignada', async () => {
      const res = await e.pedir('CAM-K-101-VB01');
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ estado: 'ASIGNADA', tecnicoNombre: 'Laura Martínez', salon: '101' });
    });

    test('reservar un portátil con el QR del salón', async () => {
      const res = await e.pedir('CAM-H-101-PC01', { tipo: 'PRESTAMO_EQUIPO', detalle: 'PORTATIL' });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ tipo: 'PRESTAMO_EQUIPO', detalle: 'PORTATIL', tecnicoNombre: 'Sofía Gómez' });
    });

    test.each([
      ['QR de otro sistema', 400, { qr: 'https://evil.com' }],
      ['préstamo sin decir qué', 400, { qr: 'SOPORTE:v1:CAM-K-101-VB01', tipo: 'PRESTAMO_EQUIPO' }],
      ['equipo no registrado', 404, { qr: 'SOPORTE:v1:CAM-Z-999-VB01' }],
    ])('%s → %i', async (_, status, cuerpo) => {
      const res = await e.como('docente').post('/api/solicitudes', { tipo: 'FALLA_EQUIPO_FIJO', ...cuerpo });
      expect(res.status).toBe(status);
      expect(res.body.error).toBeTruthy();
    });

    test('JSON mal formado → 400', async () => {
      const token = await e.login('docente');
      const res = await e.api.post('/api/solicitudes').set('Authorization', `Bearer ${token}`).set('Content-Type', 'application/json').send('{"qr":');
      expect(res.status).toBe(400);
    });

    test('ruta inexistente → 404', async () => {
      expect((await e.api.get('/api/no-existe')).status).toBe(404);
    });
  });

  describe('multisede', () => {
    test('una solicitud del NORTE se asigna al técnico del NORTE y no toca el CAMPUS', async () => {
      const res = await e.pedir('NOR-BA-101-VB01', {}, 'docente.norte');
      expect(res.body.tecnicoNombre).toBe('Andrés Pardo');

      const tecnicos = (await e.como('admin').get('/api/admin/tecnicos')).body;
      const campusOcupados = tecnicos.filter((t) => t.sede === 'CAMPUS' && t.estado !== 'DISPONIBLE');
      expect(campusOcupados).toHaveLength(0);
    });

    test('si el NORTE está saturado, la solicitud espera en la cola del NORTE aunque el CAMPUS tenga técnicos libres', async () => {
      await e.pedir('NOR-BA-101-VB01', {}, 'docente.norte');
      const res = await e.pedir('NOR-BB-101-VB01', {}, 'docente.norte');

      expect(res.body.estado).toBe('PENDIENTE');
      const colaNorte = (await e.como('admin').get('/api/sedes/NORTE/cola')).body;
      const colaCampus = (await e.como('admin').get('/api/sedes/CAMPUS/cola')).body;
      expect(colaNorte.total).toBe(1);
      expect(colaCampus).toEqual({ total: 0, items: [] });
    });

    test('el panel admin reporta la demanda y el déficit por sede', async () => {
      await e.pedir('NOR-BA-101-VB01', {}, 'docente.norte');
      await e.pedir('NOR-BB-101-VB01', {}, 'docente.norte');
      await e.pedir('NOR-BB-102-VB01', {}, 'docente.norte');

      const demanda = (await e.como('admin').get('/api/admin/demanda')).body;
      const norte = demanda.find((d) => d.sede === 'NORTE');
      const campus = demanda.find((d) => d.sede === 'CAMPUS');

      expect(norte).toMatchObject({ enCola: 2, tecnicosDisponibles: 0, deficitTecnicos: 2 });
      expect(campus).toMatchObject({ enCola: 0, tecnicosDisponibles: 3, deficitTecnicos: 0 });
    });
  });

  describe('cola con límite (mitigación de la prueba de estrés)', () => {
    test('devuelve solo las primeras N pero informa el total', async () => {
      await e.pedir('NOR-BA-101-VB01', {}, 'docente.norte'); // se la lleva Andrés
      for (const salon of ['101', '102', '201', '202']) await e.pedir(`NOR-BB-${salon}-VB01`, {}, 'docente.norte');

      const res = await e.como('admin').get('/api/sedes/NORTE/cola?limite=2');

      expect(res.body.total).toBe(4);
      expect(res.body.items.map((i) => i.posicion)).toEqual([1, 2]);
    });

    test.each(['0', '501', 'abc', '2.5'])('limite=%s → 400', async (limite) => {
      expect((await e.como('admin').get(`/api/sedes/CAMPUS/cola?limite=${limite}`)).status).toBe(400);
    });
  });

  describe('escalación automática por tiempo', () => {
    test('si Laura no acepta en 5 minutos se reasigna; el coordinador lo ve', async () => {
      const s = (await e.pedir('CAM-K-101-VB01')).body;
      e.reloj.avanzarMinutos(5);

      const r = await e.como('admin').post('/api/admin/escalar');

      expect(r.body).toEqual([{ id: s.id, accion: 'REASIGNADA' }]);
      const estado = (await e.como('docente').get(`/api/solicitudes/${s.id}`)).body;
      expect(estado.tecnicoId).not.toBe('T-LAURA');
    });

    test('el ProgramadorEscalacion (adaptador de entrada por tiempo) ejecuta el mismo caso de uso', async () => {
      const { ProgramadorEscalacion } = require('../../src/adapters/in/scheduler/ProgramadorEscalacion');
      await e.pedir('NOR-BA-101-VB01', {}, 'docente.norte'); // Andrés la toma
      await e.como('andres').post('/api/tecnicos/yo/aceptar');
      const enCola = (await e.pedir('NOR-BB-101-VB01', {}, 'docente.norte')).body; // no hay nadie más en el NORTE
      e.reloj.avanzarMinutos(10);

      const resultado = new ProgramadorEscalacion(e.contenedor.escalarVencidas, { log: {} }).tick();

      expect(resultado).toEqual([{ id: enCola.id, accion: 'ESCALADA' }]);
      const panelAdmin = (await e.como('admin').get('/api/admin/demanda')).body.find((d) => d.sede === 'NORTE');
      expect(panelAdmin.escaladas).toBe(1);
    });
  });
});
