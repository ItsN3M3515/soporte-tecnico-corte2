/**
 * Pantalla "Notificaciones" del docente.
 *
 * Patrón Decorator sobre el puerto PublicadorEventos: envuelve al publicador real y,
 * cada vez que un caso de uso publica un evento de una solicitud, además
 *  1. reenvía el evento a la sala `usuario:<quien la creó>` (su pantalla de seguimiento se actualiza sola), y
 *  2. guarda una notificación legible y la empuja como 'notificacion:nueva'.
 * Los casos de uso no cambiaron: siguen llamando a publicar(evento, datos, destinos).
 *
 * Una falla al guardar la notificación NO rompe la operación principal (ya se confirmó en BD):
 * se registra en el log y se sigue. La notificación es un aviso, no parte de la transacción.
 */
const TipoNotificacion = Object.freeze({ TECNICO: 'TECNICO', ESTADO: 'ESTADO', RESUELTA: 'RESUELTA' });
const LIMITE_POR_DEFECTO = 30;

// "Salón 301", pero "Auditorio" (no "Salón Auditorio").
const lugar = (d) => (/^\d/.test(d.salon) ? `Salón ${d.salon}` : d.salon);
const primerNombre = (nombre) => (nombre ? nombre.split(' ')[0] : 'El técnico');

const PLANTILLAS = new Map([
  // Si se asignó en el mismo momento, el aviso de "asignada" ya lo cubre: no se duplica.
  ['solicitud:creada', (d) => {
    if (d.estado === 'PROGRAMADA') return { tipo: TipoNotificacion.ESTADO, titulo: 'Solicitud agendada', mensaje: `${d.titulo} · ${lugar(d)} quedó agendada` };
    if (d.estado === 'PENDIENTE') return { tipo: TipoNotificacion.ESTADO, titulo: 'Solicitud recibida', mensaje: `${d.titulo} · ${lugar(d)} está en la cola` };
    return null;
  }],
  ['solicitud:asignada', () => ({ tipo: TipoNotificacion.ESTADO, titulo: 'Actualización de estado', mensaje: 'Tu solicitud pasó a "Asignada"' })],
  ['solicitud:aceptada', (d, t) => ({ tipo: TipoNotificacion.TECNICO, titulo: 'Técnico asignado', mensaje: `${primerNombre(t)} va en camino a ${lugar(d)}` })],
  ['tecnico:llego', (d, t) => ({ tipo: TipoNotificacion.TECNICO, titulo: 'Técnico en el salón', mensaje: `${primerNombre(t)} llegó a ${lugar(d)}` })],
  ['solicitud:resuelta', (d) => ({ tipo: TipoNotificacion.RESUELTA, titulo: 'Solicitud resuelta', mensaje: `${d.titulo} en ${lugar(d)} completado` })],
  ['solicitud:escalada', () => ({ tipo: TipoNotificacion.ESTADO, titulo: 'Actualización de estado', mensaje: 'Tu solicitud pasó al coordinador de soporte' })],
  ['solicitud:activada', () => ({ tipo: TipoNotificacion.ESTADO, titulo: 'Actualización de estado', mensaje: 'Tu solicitud agendada entró a la cola' })],
  ['solicitud:devuelta', () => ({ tipo: TipoNotificacion.ESTADO, titulo: 'Actualización de estado', mensaje: 'El técnico no pudo llegar; estamos buscando otro' })],
]);

class NotificacionesDocente {
  constructor({ publicador, repoNotificaciones, repoTecnicos, reloj, generadorId, log = console }) {
    Object.assign(this, { interno: publicador, repoNotificaciones, repoTecnicos, reloj, generadorId, log });
  }

  /** Mismo contrato que PublicadorEventos. */
  publicar(evento, datos, destinos = []) {
    const usuario = PLANTILLAS.has(evento) ? datos?.creadaPor : null;
    this.interno.publicar(evento, datos, usuario ? [...destinos, `usuario:${usuario}`] : destinos);
    if (usuario) this.#notificar(usuario, evento, datos);
  }

  /** El adaptador de Socket.IO necesita el servidor; se lo pasa al publicador real. */
  conectar(io) {
    this.interno.conectar?.(io);
  }

  listar(usuario, limite = LIMITE_POR_DEFECTO) {
    const items = this.repoNotificaciones.listarPorUsuario(usuario, limite);
    return { noLeidas: items.filter((n) => !n.leida).length, items };
  }

  marcarLeidas(usuario) {
    return { marcadas: this.repoNotificaciones.marcarLeidas(usuario) };
  }

  #notificar(usuario, evento, datos) {
    try {
      const tecnico = datos.tecnicoId ? this.repoTecnicos.buscarPorId(datos.tecnicoId) : null;
      const texto = PLANTILLAS.get(evento)(datos, tecnico?.nombre ?? datos.tecnicoNombre);
      if (!texto) return;
      const notificacion = { id: this.generadorId(), usuario, solicitudId: datos.id, ...texto, creadaEn: this.reloj.ahora(), leida: false };
      this.repoNotificaciones.guardar(notificacion);
      this.interno.publicar('notificacion:nueva', notificacion, [`usuario:${usuario}`]);
    } catch (error) {
      this.log.error?.('[notificaciones] no se pudo guardar el aviso', error);
    }
  }
}

module.exports = { NotificacionesDocente, TipoNotificacion };
