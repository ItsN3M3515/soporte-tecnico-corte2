const http = require('node:http');
const { io: conectar } = require('socket.io-client');
const { crearEntorno } = require('./entorno');
const { crearServidorSockets } = require('../../src/adapters/in/realtime/servidorSockets');

/**
 * Integración PRODUCTOR → CONSUMIDOR (reto "Reporte en tiempo real"):
 * servidor HTTP + Socket.IO reales en un puerto libre, clientes reales de socket.io.
 * Se verifica que el evento llega a quien debe y NO llega a quien no debe.
 */
describe('Tiempo real con Socket.IO', () => {
  let e;
  let servidor;
  let url;
  const clientes = [];

  beforeEach(async () => {
    e = crearEntorno();
    servidor = http.createServer(e.app);
    crearServidorSockets(servidor, e.contenedor);
    await new Promise((ok) => servidor.listen(0, ok));
    url = `http://localhost:${servidor.address().port}`;
  });

  afterEach(async () => {
    clientes.splice(0).forEach((c) => c.close());
    await new Promise((ok) => servidor.close(ok));
  });

  const clienteDe = async (usuario) => {
    const socket = conectar(url, { auth: { token: await e.login(usuario) }, transports: ['websocket'], forceNew: true });
    clientes.push(socket);
    await new Promise((ok, falla) => {
      socket.on('conectado', ok);
      socket.on('connect_error', falla);
    });
    return socket;
  };

  const esperarEvento = (socket, evento, ms = 2000) =>
    new Promise((ok, falla) => {
      const t = setTimeout(() => falla(new Error(`No llegó ${evento}`)), ms);
      socket.once(evento, (datos) => {
        clearTimeout(t);
        ok(datos);
      });
    });

  test('el técnico recibe la solicitud asignada sin recargar la pantalla', async () => {
    const laura = await clienteDe('laura');
    const llegada = esperarEvento(laura, 'solicitud:asignada');

    const creada = (await e.pedir('CAM-K-101-VB01')).body;

    const evento = await llegada;
    expect(evento).toMatchObject({ id: creada.id, salon: '101', tecnicoId: 'T-LAURA' });
  });

  test('el admin recibe la creación y los cambios de estado', async () => {
    const admin = await clienteDe('admin');
    const creada = esperarEvento(admin, 'solicitud:creada');
    const aceptada = esperarEvento(admin, 'solicitud:aceptada');

    await e.pedir('CAM-K-101-VB01');
    await e.como('laura').post('/api/tecnicos/yo/aceptar');

    await expect(creada).resolves.toMatchObject({ edificio: 'Edificio K' });
    await expect(aceptada).resolves.toMatchObject({ estado: 'EN_ATENCION', estadoTecnico: 'EN_CAMINO' });
  });

  test('un técnico de otra sede NO recibe eventos del CAMPUS (aislamiento multisede)', async () => {
    const andres = await clienteDe('andres');
    const recibidos = [];
    andres.onAny((evento) => recibidos.push(evento));

    await e.pedir('CAM-K-101-VB01');
    await new Promise((ok) => setTimeout(ok, 300));

    expect(recibidos).toEqual([]);
  });

  test('una conexión sin token válido es rechazada', async () => {
    const socket = conectar(url, { auth: { token: 'falso' }, transports: ['websocket'], forceNew: true });
    clientes.push(socket);
    const error = await new Promise((ok) => socket.on('connect_error', ok));
    expect(error.message).toMatch(/Sesión inválida/);
  });
});
