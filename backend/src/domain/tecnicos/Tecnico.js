const { Disponible, estadoDesdeNombre } = require('./estados');

/**
 * Técnico de soporte. Delega todo su comportamiento al estado actual (State).
 * `version` se usa para bloqueo optimista en la persistencia (ver ADR-002):
 * dos asignaciones simultáneas sobre el mismo técnico no pueden ganar ambas.
 */
class Tecnico {
  constructor({ id, nombre, sede, edificioBase, telefono = null, estado = 'DISPONIBLE', solicitudActualId = null, version = 0 }) {
    this.id = id;
    this.nombre = nombre;
    this.telefono = telefono;
    this.sede = sede;
    this.edificioBase = edificioBase;
    this.estado = typeof estado === 'string' ? estadoDesdeNombre(estado) : estado || new Disponible();
    this.solicitudActualId = solicitudActualId;
    this.version = version;
  }

  cambiarEstado(nuevoEstado) {
    this.estado = nuevoEstado;
  }

  asignar(solicitud, ahora) {
    this.estado.asignar(this, solicitud, ahora);
  }

  aceptar(solicitud) {
    this.estado.aceptar(this, solicitud);
  }

  confirmarLlegada() {
    this.estado.confirmarLlegada(this);
  }

  finalizar(solicitud, ahora) {
    this.estado.finalizar(this, solicitud, ahora);
  }

  cancelarAsignacion(solicitud) {
    this.estado.cancelarAsignacion(this, solicitud);
  }

  estaDisponible() {
    return this.estado.estaDisponible();
  }

  estaEsperandoRespuesta() {
    return this.estado.estaEsperandoRespuesta();
  }

  get nombreEstado() {
    return this.estado.nombre;
  }

  aVista() {
    return {
      id: this.id,
      nombre: this.nombre,
      sede: this.sede,
      edificioBase: this.edificioBase,
      telefono: this.telefono,
      estado: this.nombreEstado,
      solicitudActualId: this.solicitudActualId,
    };
  }
}

module.exports = { Tecnico };
