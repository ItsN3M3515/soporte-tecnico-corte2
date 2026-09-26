const { ColaPrioridad } = require('../prioridad/ColaPrioridad');
const { EstadoSolicitud } = require('../modelo/enums');

/**
 * Servicio de dominio que decide QUÉ técnico atiende QUÉ solicitud.
 *
 * Cambio respecto al Corte 1: ya no es Singleton con `synchronized`. En Node hay
 * un solo hilo de eventos y la consistencia entre instancias la garantiza el
 * bloqueo optimista del repositorio (columna `version`). Una única instancia se
 * crea en la raíz de composición (src/config/contenedor.js) y se inyecta. Ver ADR-002.
 *
 * Es código puro: no guarda nada. El caso de uso persiste lo que este servicio cambia.
 */
class GestorAsignaciones {
  constructor({ busqueda, politicaPrioridad }) {
    this.busqueda = busqueda;
    this.politicaPrioridad = politicaPrioridad;
  }

  /** Intenta asignar una solicitud nueva. Devuelve el técnico elegido o null (queda en cola). */
  asignar(solicitud, tecnicos, ahora) {
    const tecnico = this.busqueda.buscarTecnico(solicitud, tecnicos);
    if (!tecnico) return null;
    tecnico.asignar(solicitud, ahora);
    return tecnico;
  }

  /** Quita la solicitud al técnico que no respondió y busca otro (excluyéndolo). */
  reasignar(solicitud, tecnicoAnterior, tecnicos, ahora) {
    if (tecnicoAnterior) {
      if (!tecnicoAnterior.estaEsperandoRespuesta()) return null;
      tecnicoAnterior.cancelarAsignacion(solicitud);
    }
    const candidatos = tecnicos.filter((t) => t.id !== tecnicoAnterior?.id);
    return this.asignar(solicitud, candidatos, ahora);
  }

  /**
   * El técnico canceló (no puede llegar): la solicitud vuelve a la cola y se intenta
   * con otro técnico de la sede, nunca con el mismo. Devuelve el nuevo o null.
   */
  devolverACola(solicitud, tecnico, tecnicos, ahora) {
    tecnico.cancelarAsignacion(solicitud);
    return this.asignar(solicitud, tecnicos.filter((t) => t.id !== tecnico.id), ahora);
  }

  /**
   * Botón "Asignar manualmente" del coordinador. Puede elegir un técnico de OTRA sede:
   * es la forma de redistribuir cuando una sede se queda sin técnicos (reto multisede).
   * Las reglas de estado (técnico disponible, solicitud en cola o escalada) las aplican State y Solicitud.
   */
  asignarManualmente(solicitud, tecnico, ahora) {
    tecnico.asignar(solicitud, ahora);
    return tecnico;
  }

  /** Cuando un técnico queda libre, toma la solicitud más prioritaria de su sede. */
  siguienteParaTecnico(tecnico, abiertas, ahora) {
    if (!tecnico.estaDisponible()) return null;
    const enCola = abiertas.filter(
      (s) => s.sede === tecnico.sede && (s.estado === EstadoSolicitud.PENDIENTE || s.estado === EstadoSolicitud.ESCALADA),
    );
    const siguiente = ColaPrioridad.desde(enCola, this.politicaPrioridad, ahora).desencolar();
    if (!siguiente) return null;
    tecnico.asignar(siguiente, ahora);
    return siguiente;
  }

  colaOrdenada(solicitudes, ahora, limite = Infinity) {
    return ColaPrioridad.desde(solicitudes, this.politicaPrioridad, ahora).aListaOrdenada(limite);
  }
}

module.exports = { GestorAsignaciones };
