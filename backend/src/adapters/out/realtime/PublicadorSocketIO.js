/**
 * Adaptador de salida del puerto PublicadorEventos usando Socket.IO.
 * Cada destino es una "sala": 'admin', 'sede:<sede>', 'tecnico:<id>'.
 * Si mañana se cambia a Firebase, MQTT o push notifications, solo se
 * reemplaza este archivo; el dominio y los casos de uso no cambian.
 */
class PublicadorSocketIO {
  constructor() {
    this.io = null;
  }

  conectar(io) {
    this.io = io;
  }

  publicar(evento, datos, destinos = []) {
    if (!this.io || destinos.length === 0) return;
    this.io.to(destinos).emit(evento, datos);
  }
}

/** Publicador que no hace nada (arranque sin servidor de sockets, scripts). */
class PublicadorNulo {
  publicar() {}
}

module.exports = { PublicadorSocketIO, PublicadorNulo };
