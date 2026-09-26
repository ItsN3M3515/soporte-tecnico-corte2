/**
 * Patrón Chain of Responsibility (del Corte 1).
 * Técnico asignado → técnico cercano → coordinador.
 * Cada eslabón devuelve un resultado en vez de imprimir en consola, para que
 * el caso de uso sepa qué persistir y qué evento publicar.
 */
class EscalacionHandler {
  constructor() {
    this.siguiente = null;
  }

  setSiguiente(handler) {
    this.siguiente = handler;
    return handler;
  }

  pasar(contexto) {
    return this.siguiente ? this.siguiente.manejar(contexto) : { accion: 'SIN_ACCION' };
  }

  // eslint-disable-next-line no-unused-vars
  manejar(contexto) {
    throw new Error('Implementar en la subclase');
  }
}

/** Si el técnico ya aceptó, no hay nada que escalar. */
class TecnicoAsignadoHandler extends EscalacionHandler {
  manejar(contexto) {
    const { tecnicoAsignado } = contexto;
    if (tecnicoAsignado && !tecnicoAsignado.estaEsperandoRespuesta()) {
      return { accion: 'YA_ATENDIDA' };
    }
    return this.pasar(contexto);
  }
}

/** Intenta con otro técnico (mismo edificio, cercanos o de la sede). */
class TecnicoCercanoHandler extends EscalacionHandler {
  constructor(gestorAsignaciones) {
    super();
    this.gestor = gestorAsignaciones;
  }

  manejar(contexto) {
    const { solicitud, tecnicoAsignado, tecnicos, ahora } = contexto;
    const nuevo = this.gestor.reasignar(solicitud, tecnicoAsignado, tecnicos, ahora);
    if (nuevo) {
      return { accion: 'REASIGNADA', tecnicoNuevo: nuevo, tecnicoAnterior: tecnicoAsignado };
    }
    return this.pasar(contexto);
  }
}

/** Último eslabón: la solicitud queda marcada para el coordinador (nunca se pierde). */
class CoordinadorHandler extends EscalacionHandler {
  manejar(contexto) {
    const { solicitud, tecnicoAsignado, ahora, motivo = null } = contexto;
    if (tecnicoAsignado?.estaEsperandoRespuesta()) {
      tecnicoAsignado.cancelarAsignacion(solicitud);
    }
    // El motivo es lo que el coordinador lee en su panel ("Sin técnicos disponibles cercanos").
    solicitud.escalar(ahora ?? null, motivo);
    return { accion: 'ESCALADA', tecnicoAnterior: tecnicoAsignado };
  }
}

function construirCadenaEscalacion(gestorAsignaciones) {
  const inicio = new TecnicoAsignadoHandler();
  inicio.setSiguiente(new TecnicoCercanoHandler(gestorAsignaciones)).setSiguiente(new CoordinadorHandler());
  return inicio;
}

module.exports = {
  EscalacionHandler,
  TecnicoAsignadoHandler,
  TecnicoCercanoHandler,
  CoordinadorHandler,
  construirCadenaEscalacion,
};
