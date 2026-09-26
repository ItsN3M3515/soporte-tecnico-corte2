const { NoEncontrado } = require('../domain/errores');
const { vistaSolicitud } = require('./vistas');

/**
 * Caso de uso del coordinador: botón "Asignar manualmente" del panel.
 * Retos: "Enfoque administrativo" y "Multisede (distribución y demanda)": el coordinador
 * puede mandar un técnico disponible de otra sede cuando la sede de la solicitud no tiene.
 */
class AsignarManualmente {
  constructor({ repoSolicitudes, repoTecnicos, unidadDeTrabajo, gestor, publicador, reloj }) {
    Object.assign(this, { repoSolicitudes, repoTecnicos, unidadDeTrabajo, gestor, publicador, reloj });
  }

  ejecutar({ solicitudId, tecnicoId }) {
    const ahora = this.reloj.ahora();
    const { solicitud, tecnico } = this.unidadDeTrabajo.ejecutar(() => {
      const s = this.repoSolicitudes.buscarPorId(solicitudId);
      if (!s) throw new NoEncontrado(`Solicitud ${solicitudId} no existe.`);
      const t = this.repoTecnicos.buscarPorId(tecnicoId);
      if (!t) throw new NoEncontrado(`Técnico ${tecnicoId} no existe.`);
      this.gestor.asignarManualmente(s, t, ahora);
      this.repoSolicitudes.guardar(s);
      this.repoTecnicos.guardar(t);
      return { solicitud: s, tecnico: t };
    });
    const vista = vistaSolicitud(solicitud, { tecnicoNombre: tecnico.nombre });
    this.publicador.publicar('solicitud:asignada', vista, [`tecnico:${tecnico.id}`, 'admin', `sede:${solicitud.sede}`, `sede:${tecnico.sede}`]);
    return vista;
  }
}

module.exports = { AsignarManualmente };
