const { TransicionInvalida } = require('../errores');

/**
 * Patrón State (comportamiento) — mismo diseño del Corte 1 (Disponible, Asignado,
 * EnCamino, Ocupado), migrado a JS. Cada estado decide qué transiciones son válidas;
 * las inválidas lanzan TransicionInvalida en vez de dejar el estado inconsistente.
 */
class EstadoTecnico {
  get nombre() {
    throw new Error('Implementar en la subclase');
  }

  asignar(tecnico) {
    throw new TransicionInvalida(`${tecnico.nombre} no puede recibir una solicitud (${this.nombre}).`);
  }

  aceptar(tecnico) {
    throw new TransicionInvalida(`${tecnico.nombre} no tiene una solicitud por aceptar (${this.nombre}).`);
  }

  confirmarLlegada(tecnico) {
    throw new TransicionInvalida(`${tecnico.nombre} no puede confirmar llegada (${this.nombre}).`);
  }

  finalizar(tecnico) {
    throw new TransicionInvalida(`${tecnico.nombre} no está atendiendo ninguna solicitud (${this.nombre}).`);
  }

  cancelarAsignacion(tecnico) {
    throw new TransicionInvalida(`${tecnico.nombre} no tiene una asignación pendiente (${this.nombre}).`);
  }

  estaDisponible() {
    return false;
  }

  estaEsperandoRespuesta() {
    return false;
  }
}

class Disponible extends EstadoTecnico {
  get nombre() {
    return 'DISPONIBLE';
  }

  asignar(tecnico, solicitud, ahora) {
    solicitud.asignarA(tecnico.id, ahora);
    tecnico.solicitudActualId = solicitud.id;
    tecnico.cambiarEstado(new Asignado());
  }

  estaDisponible() {
    return true;
  }
}

class Asignado extends EstadoTecnico {
  get nombre() {
    return 'ASIGNADO';
  }

  aceptar(tecnico, solicitud) {
    solicitud.marcarEnAtencion();
    tecnico.cambiarEstado(new EnCamino());
  }

  cancelarAsignacion(tecnico, solicitud) {
    solicitud.liberar();
    tecnico.solicitudActualId = null;
    tecnico.cambiarEstado(new Disponible());
  }

  estaEsperandoRespuesta() {
    return true;
  }
}

class EnCamino extends EstadoTecnico {
  get nombre() {
    return 'EN_CAMINO';
  }

  confirmarLlegada(tecnico) {
    tecnico.cambiarEstado(new Ocupado());
  }

  /** Corte 2 ("Cancelar" en la vista del técnico): no puede llegar y devuelve la solicitud a la cola. */
  cancelarAsignacion(tecnico, solicitud) {
    solicitud.liberar();
    tecnico.solicitudActualId = null;
    tecnico.cambiarEstado(new Disponible());
  }
}

class Ocupado extends EstadoTecnico {
  get nombre() {
    return 'OCUPADO';
  }

  finalizar(tecnico, solicitud, ahora) {
    solicitud.resolver(ahora);
    tecnico.solicitudActualId = null;
    tecnico.cambiarEstado(new Disponible());
  }
}

/**
 * Fábrica simple para rehidratar el estado cuando el técnico se lee de la BD
 * (la BD guarda solo el nombre del estado).
 */
// Map en vez de objeto literal: un nombre como "toString" o "__proto__" no encuentra nada
// (hallazgo del escaneo de código, regla security/detect-object-injection).
const ESTADOS = new Map([
  ['DISPONIBLE', Disponible],
  ['ASIGNADO', Asignado],
  ['EN_CAMINO', EnCamino],
  ['OCUPADO', Ocupado],
]);

function estadoDesdeNombre(nombre) {
  const Clase = ESTADOS.get(nombre);
  if (!Clase) {
    throw new TransicionInvalida(`Estado de técnico desconocido: ${nombre}`);
  }
  return new Clase();
}

module.exports = { EstadoTecnico, Disponible, Asignado, EnCamino, Ocupado, estadoDesdeNombre };
