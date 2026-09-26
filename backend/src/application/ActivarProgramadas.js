const { vistaSolicitud } = require('./vistas');

/**
 * Caso de uso disparado por tiempo: las solicitudes agendadas ("Agendar para después",
 * mantenimiento, eventos) entran a la cola de prioridades `minutosAnticipacion` antes
 * de la hora pedida, para que el técnico alcance a llegar. Si hay técnico, se asigna.
 */
class ActivarProgramadas {
  constructor({ repoSolicitudes, repoTecnicos, unidadDeTrabajo, gestor, publicador, reloj, minutosAnticipacion = 30 }) {
    Object.assign(this, { repoSolicitudes, repoTecnicos, unidadDeTrabajo, gestor, publicador, reloj, minutosAnticipacion });
  }

  ejecutar() {
    const ahora = this.reloj.ahora();
    const limite = ahora + this.minutosAnticipacion * 60000;
    const activadas = this.unidadDeTrabajo.ejecutar(() =>
      this.repoSolicitudes
        .listarAbiertas({})
        .filter((s) => s.estaProgramada() && s.programadaPara <= limite)
        .sort((a, b) => a.programadaPara - b.programadaPara)
        .map((s) => {
          s.activar(ahora);
          const tecnico = this.gestor.asignar(s, this.repoTecnicos.listar({ sede: s.sede }), ahora);
          this.repoSolicitudes.guardar(s);
          if (tecnico) this.repoTecnicos.guardar(tecnico);
          return { solicitud: s, tecnico };
        }),
    );

    activadas.forEach(({ solicitud, tecnico }) => {
      const vista = vistaSolicitud(solicitud, { tecnicoNombre: tecnico?.nombre ?? null });
      this.publicador.publicar('solicitud:activada', vista, ['admin', `sede:${solicitud.sede}`]);
      if (tecnico) this.publicador.publicar('solicitud:asignada', vista, [`tecnico:${tecnico.id}`, 'admin', `sede:${solicitud.sede}`]);
    });
    return activadas.map(({ solicitud, tecnico }) => ({ id: solicitud.id, accion: tecnico ? 'ACTIVADA_Y_ASIGNADA' : 'ACTIVADA' }));
  }
}

module.exports = { ActivarProgramadas };
