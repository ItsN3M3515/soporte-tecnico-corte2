const { EstadoSolicitud } = require('../domain/modelo/enums');
const { vistaSolicitud } = require('./vistas');

/**
 * Caso de uso que invoca la cadena de escalación de forma automática.
 * Esto resuelve el pendiente que el README del Corte 1 dejó abierto:
 * "nada invoca la cadena por sí solo con base en el tiempo transcurrido".
 * El disparador es el adaptador src/adapters/in/scheduler/ProgramadorEscalacion.js.
 *
 *  - ASIGNADA sin aceptar por más de `minutosSinRespuesta`  → cadena completa
 *  - PENDIENTE sin técnico por más de `minutosEnCola`       → cadena completa
 */
class EscalarVencidas {
  constructor({ repoSolicitudes, repoTecnicos, unidadDeTrabajo, cadena, publicador, reloj, minutosSinRespuesta = 5, minutosEnCola = 10 }) {
    Object.assign(this, { repoSolicitudes, repoTecnicos, unidadDeTrabajo, cadena, publicador, reloj, minutosSinRespuesta, minutosEnCola });
  }

  ejecutar() {
    const ahora = this.reloj.ahora();
    const resultados = this.unidadDeTrabajo.ejecutar(() => {
      const vencidas = this.repoSolicitudes.listarAbiertas({}).filter((s) => this.#estaVencida(s, ahora));
      return vencidas.map((solicitud) => {
        const tecnicos = this.repoTecnicos.listar({ sede: solicitud.sede });
        const tecnicoAsignado = tecnicos.find((t) => t.id === solicitud.tecnicoId) ?? null;
        const r = this.cadena.manejar({ solicitud, tecnicoAsignado, tecnicos, ahora, motivo: this.#motivo(solicitud) });
        if (r.accion === 'REASIGNADA' || r.accion === 'ESCALADA') {
          this.repoSolicitudes.guardar(solicitud);
          if (r.tecnicoAnterior) this.repoTecnicos.guardar(r.tecnicoAnterior);
          if (r.tecnicoNuevo) this.repoTecnicos.guardar(r.tecnicoNuevo);
        }
        return { ...r, solicitud };
      });
    });

    resultados.forEach((r) => {
      const vista = vistaSolicitud(r.solicitud);
      if (r.accion === 'REASIGNADA') {
        this.publicador.publicar('solicitud:asignada', vista, [`tecnico:${r.tecnicoNuevo.id}`, 'admin', `sede:${vista.sede}`]);
        this.publicador.publicar('solicitud:retirada', vista, [`tecnico:${r.tecnicoAnterior.id}`]);
      }
      if (r.accion === 'ESCALADA') {
        this.publicador.publicar('solicitud:escalada', vista, ['admin', `sede:${vista.sede}`]);
        if (r.tecnicoAnterior) this.publicador.publicar('solicitud:retirada', vista, [`tecnico:${r.tecnicoAnterior.id}`]);
      }
    });

    return resultados.map((r) => ({ id: r.solicitud.id, accion: r.accion }));
  }

  #estaVencida(s, ahora) {
    const minutos = (desde) => (ahora - desde) / 60000;
    if (s.estado === EstadoSolicitud.ASIGNADA) return minutos(s.asignadaEn) >= this.minutosSinRespuesta;
    if (s.estado === EstadoSolicitud.PENDIENTE) return minutos(s.inicioEspera()) >= this.minutosEnCola;
    return false;
  }

  /** Texto que ve el coordinador en la tarjeta de la solicitud escalada. */
  #motivo(s) {
    return s.estado === EstadoSolicitud.ASIGNADA
      ? `Técnico asignado no respondió en ${this.minutosSinRespuesta} min`
      : 'Sin técnicos disponibles cercanos';
  }
}

module.exports = { EscalarVencidas };
