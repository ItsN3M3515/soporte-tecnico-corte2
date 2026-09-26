const { Solicitud } = require('./Solicitud');
const { TipoSolicitud, EstadoSolicitud, esValorDe } = require('./enums');
const { DatoInvalido } = require('../errores');
const { textoProblema, OTRO } = require('./problemasEquipo');

/**
 * Patrón Factory Method (creacional).
 *
 * Cada tipo de solicitud tiene reglas de creación distintas. El caso de uso no
 * las conoce: solo pide `crear({ tipo, ... })`. Agregar un servicio nuevo del
 * prototipo = registrar un creador nuevo en el Map (principio abierto/cerrado).
 *
 *  | Tipo               | ¿Equipo? | ¿Agenda?    | Datos propios                                        |
 *  |--------------------|----------|-------------|------------------------------------------------------|
 *  | FALLA_EQUIPO_FIJO  | sí (QR)  | no          | qué le pasa (según el equipo) + descripción          |
 *  | PRESTAMO_EQUIPO    | no       | opcional    | recurso, cantidad, internet, software                |
 *  | FALLA_ELECTRICA    | no       | no          | tipo de falla, descripción                           |
 *  | MANTENIMIENTO      | no       | obligatoria | tipo de revisión, notas                              |
 *  | SOPORTE_EVENTO     | no       | obligatoria | nombre del evento, requerimientos especiales         |
 */
const MAX_DETALLE = 200;
const MAX_NOMBRE_EVENTO = 80;
const MAX_CANTIDAD = 10;
const MAX_DIAS_AGENDA = 90;
const RECURSOS_PRESTAMO = ['PORTATIL', 'EXTENSION', 'OTRO'];
const ELEMENTOS_PRESTAMO = RECURSOS_PRESTAMO; // nombre anterior, se conserva por compatibilidad
const TIPOS_REVISION = ['GENERAL', 'AIRE_ACONDICIONADO', 'MOBILIARIO'];
const REQUERIMIENTOS_EVENTO = ['AUDIO', 'VIDEO_BEAM_EXTRA', 'STREAMING'];
const TIPOS_FALLA_ELECTRICA = ['TOMA_DANADA', 'CABLE_EXPUESTO', 'SIN_ENERGIA'];

// --- Validadores pequeños (cada regla en un solo lugar) ---
function textoOpcional(valor, max, campo) {
  if (valor === undefined || valor === null || valor === '') return null;
  if (typeof valor !== 'string') throw new DatoInvalido(`${campo} debe ser texto.`);
  const limpio = valor.trim();
  if (limpio.length > max) throw new DatoInvalido(`${campo} no puede superar ${max} caracteres.`);
  return limpio || null;
}

function textoObligatorio(valor, max, campo) {
  const texto = textoOpcional(valor, max, campo);
  if (!texto) throw new DatoInvalido(`${campo} es obligatorio.`);
  return texto;
}

function unoDe(valor, opciones, campo) {
  if (!opciones.includes(valor)) throw new DatoInvalido(`${campo}: use ${opciones.join(', ')}.`);
  return valor;
}

function subconjuntoDe(valores = [], opciones, campo) {
  if (!Array.isArray(valores)) throw new DatoInvalido(`${campo} debe ser una lista.`);
  valores.forEach((v) => unoDe(v, opciones, campo));
  return [...new Set(valores)];
}

function enteroEntre(valor, min, max, campo) {
  if (!Number.isInteger(valor) || valor < min || valor > max) {
    throw new DatoInvalido(`${campo} debe ser un número entre ${min} y ${max}.`);
  }
  return valor;
}

const booleano = (valor) => valor === true;

function validarAgenda(programadaPara, ahora, regla) {
  if (programadaPara === undefined || programadaPara === null) {
    if (regla === 'OBLIGATORIA') throw new DatoInvalido('Elija la fecha y la hora.');
    return null;
  }
  if (regla === 'NO') throw new DatoInvalido('Este tipo de solicitud se atiende de inmediato; no se puede agendar.');
  if (!Number.isFinite(programadaPara) || programadaPara <= ahora) {
    throw new DatoInvalido('La fecha elegida ya pasó.');
  }
  if (programadaPara > ahora + MAX_DIAS_AGENDA * 24 * 60 * 60 * 1000) {
    throw new DatoInvalido(`Solo se puede agendar hasta ${MAX_DIAS_AGENDA} días adelante.`);
  }
  return programadaPara;
}

function validarLugar(regla, lugar) {
  if (!lugar) throw new DatoInvalido('Falta el salón de la solicitud.');
  if (regla.equipo && !lugar.codigo) {
    throw new DatoInvalido('Para reportar una falla de equipo escanee su QR o elíjalo en la búsqueda manual.');
  }
  return lugar;
}

// --- Reglas por tipo: { equipo, agenda, datos(entrada) → { detalle, datos } } ---
function datosPrestamo({ detalle, datos = {} }) {
  const recurso = unoDe(datos.recurso ?? detalle, RECURSOS_PRESTAMO, 'Recurso del préstamo');
  const requiereSoftware = booleano(datos.requiereSoftware);
  const software = textoOpcional(datos.software, MAX_DETALLE, 'El acceso a páginas o software');
  if (requiereSoftware && !software) throw new DatoInvalido('Indique qué páginas o software necesita.');
  return {
    detalle: recurso,
    datos: {
      recurso,
      cantidad: enteroEntre(datos.cantidad ?? 1, 1, MAX_CANTIDAD, 'La cantidad de equipos'),
      requiereInternet: booleano(datos.requiereInternet),
      requiereSoftware,
      software: requiereSoftware ? software : null,
    },
  };
}

function datosFallaElectrica({ detalle, datos = {} }) {
  const descripcion = textoOpcional(datos.descripcion ?? detalle, MAX_DETALLE, 'La descripción');
  return {
    detalle: descripcion,
    datos: { tipoFalla: unoDe(datos.tipoFalla, TIPOS_FALLA_ELECTRICA, 'Tipo de falla'), descripcion },
  };
}

function datosMantenimiento({ datos = {} }) {
  const notas = textoOpcional(datos.notas, MAX_DETALLE, 'Las notas');
  return { detalle: notas, datos: { tipoRevision: unoDe(datos.tipoRevision, TIPOS_REVISION, 'Tipo de revisión'), notas } };
}

function datosEvento({ datos = {} }) {
  const nombreEvento = textoObligatorio(datos.nombreEvento, MAX_NOMBRE_EVENTO, 'El nombre del evento');
  return {
    detalle: nombreEvento,
    datos: { nombreEvento, requerimientos: subconjuntoDe(datos.requerimientos, REQUERIMIENTOS_EVENTO, 'Requerimientos') },
  };
}

/**
 * Falla de un equipo escaneado: qué le pasa (una opción que depende del equipo: un video beam
 * "no proyecta imagen", un PC "sin internet") y, si se quiere, una descripción. "Otro problema"
 * exige describirlo. Sin `problema` se acepta solo la descripción (clientes anteriores).
 */
function datosFallaEquipo({ detalle, datos = {}, lugar }) {
  const descripcion = textoOpcional(datos.descripcion ?? detalle, MAX_DETALLE, 'La descripción');
  if (datos.problema === undefined || datos.problema === null) return { detalle: descripcion, datos: {} };
  const problema = problemaDelEquipo(lugar.descripcion, datos.problema);
  return { detalle: resumenFalla(problema, descripcion), datos: { problema: problema.valor, descripcion } };
}

function problemaDelEquipo(descripcionEquipo, valor) {
  const texto = textoProblema(descripcionEquipo, valor);
  if (!texto) throw new DatoInvalido(`"${valor}" no es un problema de ${descripcionEquipo ?? 'este equipo'}.`);
  return { valor, texto };
}

/** Lo que lee el técnico: "No proyecta imagen: parpadea y se apaga" o, con "Otro problema", solo la descripción. */
function resumenFalla(problema, descripcion) {
  if (problema.valor === OTRO) {
    if (!descripcion) throw new DatoInvalido('Describa el problema.');
    return descripcion;
  }
  return descripcion ? `${problema.texto}: ${descripcion}` : problema.texto;
}

const REGLAS = new Map([
  [TipoSolicitud.FALLA_EQUIPO_FIJO, { equipo: true, agenda: 'NO', datos: datosFallaEquipo }],
  [TipoSolicitud.PRESTAMO_EQUIPO, { equipo: false, agenda: 'OPCIONAL', datos: datosPrestamo }],
  [TipoSolicitud.FALLA_ELECTRICA, { equipo: false, agenda: 'NO', datos: datosFallaElectrica }],
  [TipoSolicitud.MANTENIMIENTO, { equipo: false, agenda: 'OBLIGATORIA', datos: datosMantenimiento }],
  [TipoSolicitud.SOPORTE_EVENTO, { equipo: false, agenda: 'OBLIGATORIA', datos: datosEvento }],
]);

class FabricaSolicitudes {
  constructor(generadorId) {
    this.generadorId = generadorId;
  }

  /**
   * @param ubicacion {salon, edificio, sede, codigo?, descripcion?}: un equipo del registro
   *        o un salón resuelto por el caso de uso. `equipo` se acepta como nombre anterior.
   * `claseEnCurso` por defecto: lo que se pide "para ahora" afecta una clase; lo agendado no.
   */
  crear({ tipo, ubicacion, equipo, detalle, datos, claseEnCurso, programadaPara, creadaPor, ahora }) {
    if (!esValorDe(TipoSolicitud, tipo)) {
      throw new DatoInvalido(`Tipo de solicitud desconocido: ${tipo}.`);
    }
    const regla = REGLAS.get(tipo);
    const lugar = validarLugar(regla, ubicacion ?? equipo);
    const agenda = validarAgenda(programadaPara, ahora, regla.agenda);
    const propios = regla.datos({ detalle, datos, lugar });

    return new Solicitud({
      id: this.generadorId(),
      codigoEquipo: lugar.codigo ?? null,
      descripcionEquipo: lugar.codigo ? lugar.descripcion ?? null : null,
      salon: lugar.salon,
      edificio: lugar.edificio,
      sede: lugar.sede,
      tipo,
      detalle: propios.detalle,
      datos: propios.datos,
      claseEnCurso: claseEnCurso ?? !agenda,
      estado: agenda ? EstadoSolicitud.PROGRAMADA : EstadoSolicitud.PENDIENTE,
      programadaPara: agenda,
      creadaPor,
      creadaEn: ahora,
    });
  }
}

module.exports = {
  FabricaSolicitudes,
  ELEMENTOS_PRESTAMO,
  RECURSOS_PRESTAMO,
  TIPOS_REVISION,
  REQUERIMIENTOS_EVENTO,
  TIPOS_FALLA_ELECTRICA,
  MAX_DETALLE,
  MAX_CANTIDAD,
  MAX_DIAS_AGENDA,
};
