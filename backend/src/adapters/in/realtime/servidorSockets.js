const { Server } = require('socket.io');
const { Rol } = require('../../../domain/modelo/enums');

/**
 * Adaptador de ENTRADA de Socket.IO: autentica la conexión con el mismo JWT
 * y mete a cada cliente en las salas que le corresponden según su rol.
 *  - ADMIN   → 'admin' (ve todo)
 *  - TECNICO → 'tecnico:<id>' y 'sede:<sede>' (su trabajo y la cola de su sede)
 *  - DOCENTE / ESTUDIANTE → 'sede:<sede>' y 'usuario:<usuario>' (seguimiento y notificaciones de SUS solicitudes)
 */
function crearServidorSockets(httpServer, { credenciales, publicador }) {
  const io = new Server(httpServer, { cors: { origin: '*' } });

  io.use((socket, next) => {
    try {
      socket.data.usuario = credenciales.leerToken(socket.handshake.auth?.token);
      next();
    } catch (e) {
      next(new Error(e.message));
    }
  });

  io.on('connection', (socket) => {
    const u = socket.data.usuario;
    if (u.rol === Rol.ADMIN) socket.join('admin');
    if (u.rol === Rol.TECNICO && u.tecnicoId) socket.join(`tecnico:${u.tecnicoId}`);
    if (u.sede) socket.join(`sede:${u.sede}`);
    if (u.usuario) socket.join(`usuario:${u.usuario}`);
    socket.emit('conectado', { salas: [...socket.rooms].filter((r) => r !== socket.id) });
  });

  publicador.conectar(io);
  return io;
}

module.exports = { crearServidorSockets };
