/**
 * DOBLES DE PRUEBA para las pruebas unitarias.
 *  - Fakes: repositorios en memoria que cumplen el mismo puerto que SQLite.
 *  - RelojFalso: controla el tiempo (aging, escalación) sin esperar minutos reales.
 *  - Los espías (jest.fn) del publicador se crean en cada prueba.
 * Ninguno toca BD, red ni frameworks: las pruebas unitarias quedan aisladas.
 */
const { Tecnico } = require('../../src/domain/tecnicos/Tecnico');
const { Solicitud } = require('../../src/domain/modelo/Solicitud');

const clonarSolicitud = (s) => new Solicitud({ ...s });
const clonarTecnico = (t) => new Tecnico({ ...t, estado: t.nombreEstado });

class RepoSolicitudesFake {
  constructor() {
    this.datos = new Map();
  }

  guardar(s) {
    this.datos.set(s.id, clonarSolicitud(s));
  }

  buscarPorId(id) {
    const s = this.datos.get(id);
    return s ? clonarSolicitud(s) : null;
  }

  listarAbiertas({ sede } = {}) {
    return [...this.datos.values()].filter((s) => s.estaAbierta() && (!sede || s.sede === sede)).map(clonarSolicitud);
  }

  listarDesde(ts) {
    return [...this.datos.values()].filter((s) => s.creadaEn >= ts).map(clonarSolicitud);
  }

  listarConActividadDesde(ts) {
    return [...this.datos.values()]
      .filter((s) => s.creadaEn >= ts || (s.resueltaEn ?? -1) >= ts || (s.escaladaEn ?? -1) >= ts)
      .map(clonarSolicitud);
  }

  listarPorCreador(usuario, limite = 30) {
    return [...this.datos.values()]
      .filter((s) => s.creadaPor === usuario)
      .sort((a, b) => b.creadaEn - a.creadaEn)
      .slice(0, limite)
      .map(clonarSolicitud);
  }
}

class RepoTecnicosFake {
  constructor(tecnicos = []) {
    this.datos = new Map(tecnicos.map((t) => [t.id, clonarTecnico(t)]));
  }

  guardar(t) {
    this.datos.set(t.id, clonarTecnico(t));
  }

  buscarPorId(id) {
    const t = this.datos.get(id);
    return t ? clonarTecnico(t) : null;
  }

  listar({ sede } = {}) {
    return [...this.datos.values()].filter((t) => !sede || t.sede === sede).map(clonarTecnico);
  }
}

class RepoEquiposFake {
  constructor(equipos = []) {
    this.equipos = equipos;
  }

  buscarPorCodigo(codigo) {
    return this.equipos.find((e) => e.codigo === codigo) ?? null;
  }

  listar() {
    return this.equipos;
  }

  listarPorSalon(edificio, salon) {
    return this.equipos.filter((e) => e.edificio === edificio && e.salon === salon);
  }
}

class RepoNotificacionesFake {
  constructor() {
    this.datos = [];
  }

  guardar(n) {
    this.datos.push({ ...n });
  }

  listarPorUsuario(usuario, limite = 30) {
    return this.datos.filter((n) => n.usuario === usuario).reverse().slice(0, limite);
  }

  marcarLeidas(usuario) {
    const pendientes = this.datos.filter((n) => n.usuario === usuario && !n.leida);
    pendientes.forEach((n) => {
      n.leida = true;
    });
    return pendientes.length;
  }
}

const unidadDeTrabajoDirecta = { ejecutar: (fn) => fn() };

class RelojFalso {
  constructor(inicio = Date.UTC(2026, 8, 22, 12, 0, 0)) {
    this.t = inicio;
  }

  ahora() {
    return this.t;
  }

  avanzarMinutos(m) {
    this.t += m * 60000;
  }
}

const EQUIPOS = [
  { codigo: 'CAM-O-101-VB01', descripcion: 'Video Beam', salon: '101', edificio: 'Edificio O', sede: 'CAMPUS' },
  { codigo: 'CAM-O-101-PC01', descripcion: 'PC de salón', salon: '101', edificio: 'Edificio O', sede: 'CAMPUS' },
  { codigo: 'CAM-K-101-VB01', descripcion: 'Video beam', salon: '101', edificio: 'Edificio K', sede: 'CAMPUS' },
  { codigo: 'CAM-H-101-PC01', descripcion: 'PC docente', salon: '101', edificio: 'Edificio H', sede: 'CAMPUS' },
  { codigo: 'NOR-BA-101-VB01', descripcion: 'Video beam', salon: '101', edificio: 'Bloque A', sede: 'NORTE' },
];

const nuevoTecnico = (id, sede, edificioBase, estado = 'DISPONIBLE') => new Tecnico({ id, nombre: id, sede, edificioBase, estado });

let contador = 0;
const nuevaSolicitud = (datos = {}) =>
  new Solicitud({
    id: `S-${(contador += 1)}`,
    codigoEquipo: 'CAM-K-101-VB01',
    salon: '101',
    edificio: 'Edificio K',
    sede: 'CAMPUS',
    tipo: 'FALLA_EQUIPO_FIJO',
    claseEnCurso: false,
    creadaEn: Date.UTC(2026, 8, 22, 12, 0, 0),
    ...datos,
  });

module.exports = {
  RepoSolicitudesFake,
  RepoTecnicosFake,
  RepoEquiposFake,
  RepoNotificacionesFake,
  unidadDeTrabajoDirecta,
  RelojFalso,
  EQUIPOS,
  nuevoTecnico,
  nuevaSolicitud,
};
