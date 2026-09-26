const { crearEntorno } = require('./entorno');

/**
 * PRUEBA DE SISTEMA (caja negra): solo usa la interfaz pública HTTP, igual que
 * lo haría la app Expo. No mira clases internas ni la BD.
 *
 * Historia completa de una mañana en el Edificio O (sin carrito propio):
 *  1. Tres docentes escanean QR casi al tiempo → se asignan Laura, Miguel y Sofía.
 *  2. Un cuarto docente pide un portátil y otro reporta una falla con clase → no hay
 *     técnicos libres, quedan en cola.
 *  3. Laura termina: el sistema le entrega la falla con clase (más prioritaria)
 *     aunque el préstamo llegó antes.
 *  4. El docente consulta su solicitud y el admin ve las métricas.
 */
describe('Flujo de sistema end-to-end', () => {
  test('de escanear el QR a resolver, con cola de prioridades y panel admin', async () => {
    const e = crearEntorno();

    // 1. tres solicitudes con técnicos disponibles
    const asignadas = [];
    for (const salon of ['101', '102', '201']) {
      const r = await e.pedir(`CAM-O-${salon}-VB01`);
      expect(r.status).toBe(201);
      asignadas.push(r.body);
    }
    expect(asignadas.map((s) => s.tecnicoNombre)).toEqual(['Laura Martínez', 'Miguel Rodríguez', 'Sofía Gómez']); // K y Ad Portas son cercanos a O; Sofía por sede

    // 2. cola
    e.reloj.avanzarMinutos(1);
    const prestamo = (await e.pedir('CAM-O-202-PC01', { tipo: 'PRESTAMO_EQUIPO', detalle: 'PORTATIL', claseEnCurso: false })).body;
    e.reloj.avanzarMinutos(1);
    const urgente = (await e.pedir('CAM-O-301-VB01')).body;
    expect([prestamo.estado, urgente.estado]).toEqual(['PENDIENTE', 'PENDIENTE']);

    const panelLaura = (await e.como('laura').get('/api/tecnicos/yo/panel')).body;
    expect(panelLaura.colaSede.items.map((c) => c.id)).toEqual([urgente.id, prestamo.id]);

    // 3. Laura atiende y termina
    await e.como('laura').post('/api/tecnicos/yo/aceptar');
    e.reloj.avanzarMinutos(3);
    await e.como('laura').post('/api/tecnicos/yo/llegada');
    e.reloj.avanzarMinutos(10);
    const fin = (await e.como('laura').post('/api/tecnicos/yo/finalizar')).body;

    expect(fin.solicitud.estado).toBe('RESUELTA');
    expect(fin.siguiente.id).toBe(urgente.id);

    // 4a. el docente consulta
    const miSolicitud = (await e.como('docente').get(`/api/solicitudes/${prestamo.id}`)).body;
    expect(miSolicitud).toMatchObject({ estado: 'PENDIENTE', posicionEnCola: 1 });

    // 4b. el admin ve la demanda
    const campus = (await e.como('admin').get('/api/admin/demanda')).body.find((d) => d.sede === 'CAMPUS');
    expect(campus).toMatchObject({ enCola: 1, enAtencion: 3, resueltas24h: 1, tecnicosDisponibles: 0, deficitTecnicos: 1 });
    expect(campus.demandaPorEdificio).toEqual([{ edificio: 'Edificio O', total: 5 }]);
  });
});
