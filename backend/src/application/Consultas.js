const { EstadoSolicitud, Rol } = require('../domain/modelo/enums');
const { AccesoDenegado, NoEncontrado } = require('../domain/errores');
const { vistaSolicitud } = require('./vistas');

const UN_DIA_MS = 24 * 60 * 60 * 1000;
const LIMITE_COLA_POR_DEFECTO = 50;
const LIMITE_MIS_SOLICITUDES = 30;
const ZONA_COLOMBIA_MIN = -300; // UTC-5, sin horario de verano: "hoy" en el panel es el día en Bogotá
const enCola = (s) => s.estado === EstadoSolicitud.PENDIENTE || s.estado === EstadoSolicitud.ESCALADA;
const promedio = (xs) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);

/**
 * Consultas de solo lectura para las pantallas:
 *  - colaDeSede: la cola ordenada por prioridad (pantalla del trabajador y admin)
 *  - panelTecnico: lo que ve un técnico al abrir la app
 *  - demandaPorSede: reto "Enfoque administrativo" + "Multisede (distribución y demanda)"
 *  - estadoSolicitud: el docente o estudiante consulta cómo va SU solicitud (pantalla "Seguimiento").
 *    Solo la ven quien la creó, los técnicos de su sede y el coordinador (reto "Enfoque administrativo").
 *  - misSolicitudes: pantalla "Mis solicitudes" (activas e historial) y la tarjeta del inicio
 *  - resumenHoy / escaladas: tarjetas y lista del "Panel del coordinador"
 *  - ubicaciones / equiposDeSalon: selector de edificio y salón y la búsqueda manual cuando el QR no lee
 */
/** Quién puede ver el detalle de una solicitud. `quien` es el perfil de la sesión (el del token). */
function puedeVer(s, quien) {
  if (quien.rol === Rol.ADMIN) return true;
  if (s.creadaPor === quien.usuario) return true;
  return quien.rol === Rol.TECNICO && (s.tecnicoId === quien.tecnicoId || s.sede === quien.sede);
}

class Consultas {
  constructor({ repoSolicitudes, repoTecnicos, repoEquipos, gestor, reloj, zonaHorariaMin = ZONA_COLOMBIA_MIN }) {
    Object.assign(this, { repoSolicitudes, repoTecnicos, repoEquipos, gestor, reloj, zonaHorariaMin });
  }

  #vistaConTecnico(s, extra = {}) {
    const t = s.tecnicoId ? this.repoTecnicos.buscarPorId(s.tecnicoId) : null;
    const tecnico = t ? { id: t.id, nombre: t.nombre, edificioBase: t.edificioBase, telefono: t.telefono, estado: t.nombreEstado } : null;
    return vistaSolicitud(s, { tecnico, tecnicoNombre: tecnico?.nombre ?? null, ...extra });
  }

  #inicioDelDia(ahora) {
    const local = ahora + this.zonaHorariaMin * 60000;
    return ahora - (((local % UN_DIA_MS) + UN_DIA_MS) % UN_DIA_MS);
  }

  /**
   * Primeras `limite` solicitudes de la cola de la sede, en orden de atención.
   * El límite existe por la prueba de estrés (docs/pruebas.md §4): devolver la cola
   * completa hacía que cada refresco de pantalla serializara miles de filas y
   * bloqueara el hilo de Node. Una pantalla solo necesita las primeras.
   */
  colaDeSede(sede, limite = LIMITE_COLA_POR_DEFECTO) {
    const ahora = this.reloj.ahora();
    const pendientes = this.repoSolicitudes.listarAbiertas({ sede }).filter(enCola);
    const items = this.gestor.colaOrdenada(pendientes, ahora, limite).map(({ solicitud, prioridad }, i) =>
      vistaSolicitud(solicitud, { prioridad, posicion: i + 1, minutosEsperando: solicitud.minutosEsperando(ahora) }),
    );
    return { total: pendientes.length, items };
  }

  panelTecnico(tecnicoId) {
    const tecnico = this.repoTecnicos.buscarPorId(tecnicoId);
    if (!tecnico) throw new NoEncontrado(`Técnico ${tecnicoId} no existe.`);
    const actual = tecnico.solicitudActualId ? this.repoSolicitudes.buscarPorId(tecnico.solicitudActualId) : null;
    const ahora = this.reloj.ahora();
    return {
      tecnico: tecnico.aVista(),
      solicitudActual: actual ? vistaSolicitud(actual, { minutosDesdeCreada: Math.floor((ahora - actual.creadaEn) / 60000) }) : null,
      colaSede: this.colaDeSede(tecnico.sede),
    };
  }

  estadoSolicitud(id, quien) {
    const s = this.repoSolicitudes.buscarPorId(id);
    if (!s) throw new NoEncontrado(`Solicitud ${id} no existe.`);
    if (quien && !puedeVer(s, quien)) {
      throw new AccesoDenegado('Solo quien creó la solicitud, los técnicos de su sede y el coordinador pueden verla.');
    }
    const extra = {};
    if (enCola(s)) {
      const pendientes = this.repoSolicitudes.listarAbiertas({ sede: s.sede }).filter(enCola);
      const orden = this.gestor.colaOrdenada(pendientes, this.reloj.ahora());
      extra.posicionEnCola = orden.findIndex((c) => c.solicitud.id === s.id) + 1;
    }
    return this.#vistaConTecnico(s, extra);
  }

  /** "Mis solicitudes": las abiertas arriba (la más reciente primero) y luego el historial. */
  misSolicitudes(usuario, limite = LIMITE_MIS_SOLICITUDES) {
    const todas = this.repoSolicitudes.listarPorCreador(usuario, limite);
    return {
      activas: todas.filter((s) => s.estaAbierta()).map((s) => this.#vistaConTecnico(s)),
      historial: todas.filter((s) => !s.estaAbierta()).map((s) => vistaSolicitud(s)),
    };
  }

  /** Tarjetas del panel del coordinador: escaladas hoy, resueltas hoy y tiempo promedio de resolución. */
  resumenHoy() {
    const ahora = this.reloj.ahora();
    const inicio = this.#inicioDelDia(ahora);
    const hoy = this.repoSolicitudes.listarConActividadDesde(inicio);
    const resueltasHoy = hoy.filter((s) => s.resueltaEn !== null && s.resueltaEn >= inicio);
    return {
      desde: inicio,
      escaladasHoy: hoy.filter((s) => s.escaladaEn !== null && s.escaladaEn >= inicio).length,
      resueltasHoy: resueltasHoy.length,
      minutosPromedioResolucion: promedio(resueltasHoy.map((s) => (s.resueltaEn - s.inicioEspera()) / 60000)),
    };
  }

  /** Lista "Solicitudes escaladas" con el motivo; las que llevan más tiempo esperando van primero. */
  escaladas() {
    const ahora = this.reloj.ahora();
    return this.repoSolicitudes
      .listarAbiertas({})
      .filter((s) => s.estado === EstadoSolicitud.ESCALADA)
      .sort((a, b) => a.inicioEspera() - b.inicioEspera())
      .map((s) => vistaSolicitud(s, { minutosEsperando: s.minutosEsperando(ahora) }));
  }

  /** Sedes → edificios → salones, a partir del registro de equipos (para los selectores de la app). */
  ubicaciones() {
    const sedes = new Map();
    this.repoEquipos.listar().forEach((e) => {
      if (!sedes.has(e.sede)) sedes.set(e.sede, new Map());
      const edificios = sedes.get(e.sede);
      if (!edificios.has(e.edificio)) edificios.set(e.edificio, new Set());
      edificios.get(e.edificio).add(e.salon);
    });
    return [...sedes].map(([sede, edificios]) => ({
      sede,
      edificios: [...edificios].map(([edificio, salones]) => ({ edificio, salones: [...salones].sort() })),
    }));
  }

  /** Búsqueda manual cuando el QR está dañado: equipos registrados en un salón. */
  equiposDeSalon(edificio, salon) {
    const equipos = this.repoEquipos.listarPorSalon(edificio, salon);
    if (equipos.length === 0) throw new NoEncontrado(`No hay equipos registrados en el salón ${salon} de ${edificio}.`);
    return equipos;
  }

  demandaPorSede() {
    const ahora = this.reloj.ahora();
    const recientes = this.repoSolicitudes.listarDesde(ahora - UN_DIA_MS);
    const abiertas = this.repoSolicitudes.listarAbiertas({});
    const tecnicos = this.repoTecnicos.listar({});
    const sedes = [...new Set([...tecnicos.map((t) => t.sede), ...this.repoEquipos.listar().map((e) => e.sede)])].sort();

    return sedes.map((sede) => {
      const deSede = (xs) => xs.filter((x) => x.sede === sede);
      const abiertasSede = deSede(abiertas);
      const recientesSede = deSede(recientes);
      const tecnicosSede = deSede(tecnicos);
      const colaSede = abiertasSede.filter(enCola);
      const disponibles = tecnicosSede.filter((t) => t.estaDisponible()).length;

      const porEdificio = {};
      recientesSede.forEach((s) => {
        porEdificio[s.edificio] = (porEdificio[s.edificio] || 0) + 1;
      });

      return {
        sede,
        enCola: colaSede.length,
        escaladas: abiertasSede.filter((s) => s.estado === EstadoSolicitud.ESCALADA).length,
        enAtencion: abiertasSede.filter((s) => s.estado === EstadoSolicitud.ASIGNADA || s.estado === EstadoSolicitud.EN_ATENCION).length,
        resueltas24h: recientesSede.filter((s) => s.estado === EstadoSolicitud.RESUELTA).length,
        tecnicosTotal: tecnicosSede.length,
        tecnicosDisponibles: disponibles,
        // Déficit: cuántos técnicos faltarían para atender ya toda la cola de la sede.
        deficitTecnicos: Math.max(0, colaSede.length - disponibles),
        minutosPromedioAsignacion: promedio(
          recientesSede.filter((s) => s.asignadaEn).map((s) => (s.asignadaEn - s.creadaEn) / 60000),
        ),
        minutosPromedioResolucion: promedio(
          recientesSede.filter((s) => s.resueltaEn).map((s) => (s.resueltaEn - s.creadaEn) / 60000),
        ),
        demandaPorEdificio: Object.entries(porEdificio)
          .map(([edificio, total]) => ({ edificio, total }))
          .sort((a, b) => b.total - a.total),
      };
    });
  }
}

module.exports = { Consultas, LIMITE_COLA_POR_DEFECTO, ZONA_COLOMBIA_MIN };
