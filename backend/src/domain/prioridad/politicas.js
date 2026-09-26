const { TipoSolicitud } = require('../modelo/enums');

/**
 * Patrón Strategy (comportamiento): cómo se calcula la prioridad de una solicitud.
 * La cola no sabe de reglas de negocio; recibe una política y la aplica.
 *
 * Política por defecto: impacto + envejecimiento (aging).
 *  - Impacto: una falla con clase en curso es lo más urgente.
 *  - Aging: cada minuto en espera suma puntos, con un tope, para que una
 *    solicitud de baja prioridad no se quede esperando para siempre (inanición).
 */
// Map (no objeto literal) para que un tipo raro no encuentre propiedades heredadas.
// Corte 2: la falla eléctrica va justo debajo de la falla de equipo (puede dejar
// el salón sin energía y es un riesgo); el mantenimiento preventivo es lo último.
const PUNTOS_BASE = new Map([
  [TipoSolicitud.FALLA_EQUIPO_FIJO, { conClase: 100, sinClase: 50 }],
  [TipoSolicitud.FALLA_ELECTRICA, { conClase: 90, sinClase: 60 }],
  [TipoSolicitud.SOPORTE_EVENTO, { conClase: 70, sinClase: 40 }],
  [TipoSolicitud.PRESTAMO_EQUIPO, { conClase: 60, sinClase: 30 }],
  [TipoSolicitud.MANTENIMIENTO, { conClase: 20, sinClase: 10 }],
]);

const PUNTOS_POR_MINUTO = 2;
const TOPE_MINUTOS_AGING = 60; // después de 60 min ya no sigue subiendo

class PoliticaImpactoYEspera {
  calcular(solicitud, ahora) {
    const base = PUNTOS_BASE.get(solicitud.tipo);
    const impacto = solicitud.claseEnCurso ? base.conClase : base.sinClase;
    const minutos = Math.min(solicitud.minutosEsperando(ahora), TOPE_MINUTOS_AGING);
    return impacto + minutos * PUNTOS_POR_MINUTO;
  }
}

/** Política alternativa (FIFO puro). Sirve para comparar en pruebas y demostrar el Strategy. */
class PoliticaOrdenDeLlegada {
  calcular() {
    return 0;
  }
}

module.exports = {
  PoliticaImpactoYEspera,
  PoliticaOrdenDeLlegada,
  PUNTOS_BASE,
  PUNTOS_POR_MINUTO,
  TOPE_MINUTOS_AGING,
};
