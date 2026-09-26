/**
 * Enumeraciones del dominio (vienen del Corte 1: TipoSolicitud y EstadoSolicitud).
 * Object.freeze evita que se modifiquen en tiempo de ejecución.
 *
 * Corte 2: se agregan los servicios del prototipo AsisTec (Figma):
 * mantenimiento, soporte para eventos y falla eléctrica, y el estado PROGRAMADA
 * para las solicitudes agendadas ("Agendar para después").
 */
const TipoSolicitud = Object.freeze({
  FALLA_EQUIPO_FIJO: 'FALLA_EQUIPO_FIJO', // video beam, cables, PC del salón (se identifica por QR)
  PRESTAMO_EQUIPO: 'PRESTAMO_EQUIPO', // computador portátil, extensión u otro recurso
  FALLA_ELECTRICA: 'FALLA_ELECTRICA', // tomas, extensiones, cableado
  MANTENIMIENTO: 'MANTENIMIENTO', // revisión preventiva de salón (siempre agendada)
  SOPORTE_EVENTO: 'SOPORTE_EVENTO', // configuración especial de salas (siempre agendada)
});

const EstadoSolicitud = Object.freeze({
  PROGRAMADA: 'PROGRAMADA', // agendada: todavía no entra a la cola
  PENDIENTE: 'PENDIENTE', // en la cola, sin técnico
  ASIGNADA: 'ASIGNADA', // técnico asignado, esperando que acepte
  EN_ATENCION: 'EN_ATENCION', // técnico aceptó (en camino o en el salón)
  ESCALADA: 'ESCALADA', // pasó al coordinador
  RESUELTA: 'RESUELTA',
});

const Rol = Object.freeze({
  DOCENTE: 'DOCENTE',
  ESTUDIANTE: 'ESTUDIANTE', // también reserva equipos y reporta fallas, igual que el docente
  TECNICO: 'TECNICO',
  ADMIN: 'ADMIN',
});

const esValorDe = (enumeracion, valor) => Object.values(enumeracion).includes(valor);

module.exports = { TipoSolicitud, EstadoSolicitud, Rol, esValorDe };
