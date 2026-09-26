const { NoEncontrado, TransicionInvalida } = require('../domain/errores');
const { vistaSolicitud } = require('./vistas');

/**
 * Caso de uso de la "Pantalla del trabajador": el técnico acepta, confirma
 * llegada y finaliza. Al finalizar, el sistema le asigna de inmediato la
 * siguiente solicitud más prioritaria de su sede (cola de prioridades).
 * Corte 2: botón "Cancelar" (el técnico no puede llegar) → la solicitud vuelve a la
 * cola y se busca otro técnico de la sede en la misma transacción.
 */
const sinEntidad = ({ solicitudEntidad: _omitida, ...resto }) => resto;

class AtenderSolicitud {
  constructor({ repoSolicitudes, repoTecnicos, unidadDeTrabajo, gestor, publicador, reloj }) {
    Object.assign(this, { repoSolicitudes, repoTecnicos, unidadDeTrabajo, gestor, publicador, reloj });
  }

  aceptar(tecnicoId) {
    return sinEntidad(this.#accion(tecnicoId, (tecnico, solicitud) => tecnico.aceptar(solicitud), 'solicitud:aceptada'));
  }

  confirmarLlegada(tecnicoId) {
    return sinEntidad(this.#accion(tecnicoId, (tecnico) => tecnico.confirmarLlegada(), 'tecnico:llego'));
  }

  finalizar(tecnicoId) {
    const ahora = this.reloj.ahora();
    let siguiente = null;
    const resultado = this.#accion(
      tecnicoId,
      (tecnico, solicitud) => {
        tecnico.finalizar(solicitud, ahora);
        const abiertas = this.repoSolicitudes.listarAbiertas({ sede: tecnico.sede });
        siguiente = this.gestor.siguienteParaTecnico(tecnico, abiertas, ahora);
        if (siguiente) this.repoSolicitudes.guardar(siguiente);
      },
      'solicitud:resuelta',
    );
    if (siguiente) {
      const vista = vistaSolicitud(siguiente, { tecnicoNombre: resultado.tecnico.nombre });
      this.publicador.publicar('solicitud:asignada', vista, [`tecnico:${tecnicoId}`, 'admin', `sede:${siguiente.sede}`]);
    }
    return { ...sinEntidad(resultado), siguiente: siguiente ? vistaSolicitud(siguiente) : null };
  }

  cancelar(tecnicoId) {
    const ahora = this.reloj.ahora();
    let nuevo = null;
    const resultado = this.#accion(
      tecnicoId,
      (tecnico, solicitud) => {
        const companeros = this.repoTecnicos.listar({ sede: tecnico.sede });
        nuevo = this.gestor.devolverACola(solicitud, tecnico, companeros, ahora);
        if (nuevo) this.repoTecnicos.guardar(nuevo);
      },
      'solicitud:devuelta',
    );
    if (nuevo) {
      const vista = vistaSolicitud(resultado.solicitudEntidad, { tecnicoNombre: nuevo.nombre });
      this.publicador.publicar('solicitud:asignada', vista, [`tecnico:${nuevo.id}`, 'admin', `sede:${vista.sede}`]);
    }
    return { ...sinEntidad(resultado), nuevoTecnico: nuevo ? nuevo.aVista() : null };
  }

  #accion(tecnicoId, aplicar, evento) {
    const res = this.unidadDeTrabajo.ejecutar(() => {
      const tecnico = this.repoTecnicos.buscarPorId(tecnicoId);
      if (!tecnico) throw new NoEncontrado(`Técnico ${tecnicoId} no existe.`);
      if (!tecnico.solicitudActualId) {
        throw new TransicionInvalida(`${tecnico.nombre} no tiene una solicitud activa.`);
      }
      const solicitud = this.repoSolicitudes.buscarPorId(tecnico.solicitudActualId);
      aplicar(tecnico, solicitud);
      this.repoSolicitudes.guardar(solicitud);
      this.repoTecnicos.guardar(tecnico);
      return { tecnico, solicitud };
    });
    const vista = vistaSolicitud(res.solicitud, { tecnicoNombre: res.tecnico.nombre, estadoTecnico: res.tecnico.nombreEstado });
    this.publicador.publicar(evento, vista, ['admin', `sede:${res.solicitud.sede}`, `tecnico:${tecnicoId}`]);
    return { tecnico: res.tecnico.aVista(), solicitud: vista, solicitudEntidad: res.solicitud };
  }
}

module.exports = { AtenderSolicitud };
