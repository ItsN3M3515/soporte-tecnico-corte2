const { TipoSolicitud } = require('../domain/modelo/enums');

/**
 * Convierte entidades en objetos planos para responder (sin exponer métodos internos).
 * `titulo` es el texto corto que muestran las tarjetas de la app ("Video Beam", "Préstamo de PC").
 */
const NOMBRE_RECURSO = new Map([
  ['PORTATIL', 'PC'],
  ['EXTENSION', 'extensión'],
  ['OTRO', 'equipo'],
]);

const TITULOS = new Map([
  [TipoSolicitud.FALLA_EQUIPO_FIJO, (s) => s.descripcionEquipo ?? 'Falla de equipo'],
  [TipoSolicitud.PRESTAMO_EQUIPO, (s) => {
    const recurso = NOMBRE_RECURSO.get(s.datos?.recurso ?? s.detalle) ?? 'equipo';
    const cantidad = s.datos?.cantidad ?? 1;
    return cantidad > 1 ? `Préstamo de ${cantidad} ${recurso === 'PC' ? 'PC' : `${recurso}s`}` : `Préstamo de ${recurso}`;
  }],
  [TipoSolicitud.FALLA_ELECTRICA, () => 'Falla eléctrica'],
  [TipoSolicitud.MANTENIMIENTO, () => 'Mantenimiento'],
  [TipoSolicitud.SOPORTE_EVENTO, (s) => s.datos?.nombreEvento ?? 'Soporte para evento'],
]);

function tituloSolicitud(s) {
  const titulo = TITULOS.get(s.tipo);
  return titulo ? titulo(s) : 'Solicitud';
}

function vistaSolicitud(s, extra = {}) {
  return {
    id: s.id,
    titulo: tituloSolicitud(s),
    codigoEquipo: s.codigoEquipo,
    descripcionEquipo: s.descripcionEquipo,
    salon: s.salon,
    edificio: s.edificio,
    sede: s.sede,
    tipo: s.tipo,
    detalle: s.detalle,
    datos: s.datos,
    claseEnCurso: s.claseEnCurso,
    estado: s.estado,
    tecnicoId: s.tecnicoId,
    creadaPor: s.creadaPor,
    creadaEn: s.creadaEn,
    programadaPara: s.programadaPara,
    asignadaEn: s.asignadaEn,
    resueltaEn: s.resueltaEn,
    escaladaEn: s.escaladaEn,
    motivoEscalacion: s.motivoEscalacion,
    ...extra,
  };
}

module.exports = { vistaSolicitud, tituloSolicitud };
