/** Tipos que devuelve el backend (ver backend/src/application/vistas.js). */
export type Rol = 'DOCENTE' | 'ESTUDIANTE' | 'TECNICO' | 'ADMIN';
export type TipoSolicitud = 'FALLA_EQUIPO_FIJO' | 'PRESTAMO_EQUIPO' | 'FALLA_ELECTRICA' | 'MANTENIMIENTO' | 'SOPORTE_EVENTO';
export type EstadoSolicitud = 'PROGRAMADA' | 'PENDIENTE' | 'ASIGNADA' | 'EN_ATENCION' | 'ESCALADA' | 'RESUELTA';
export type EstadoTecnico = 'DISPONIBLE' | 'ASIGNADO' | 'EN_CAMINO' | 'OCUPADO';

export interface Perfil {
  usuario: string;
  nombre: string;
  rol: Rol;
  sede: string | null;
  tecnicoId: string | null;
  correo: string | null;
}

export interface Equipo {
  codigo: string;
  descripcion: string;
  salon: string;
  edificio: string;
  sede: string;
  /** Qué le puede pasar a este tipo de equipo (lo decide el backend); el último es "Otro problema". */
  problemas?: { valor: string; texto: string }[];
}

export interface Ubicaciones {
  sede: string;
  edificios: { edificio: string; salones: string[] }[];
}

export interface TecnicoResumen {
  id: string;
  nombre: string;
  edificioBase: string;
  telefono: string | null;
  estado: EstadoTecnico;
}

export interface Solicitud {
  id: string;
  titulo: string;
  codigoEquipo: string | null;
  descripcionEquipo: string | null;
  salon: string;
  edificio: string;
  sede: string;
  tipo: TipoSolicitud;
  detalle: string | null;
  datos: Record<string, unknown>;
  claseEnCurso: boolean;
  estado: EstadoSolicitud;
  tecnicoId: string | null;
  tecnicoNombre?: string | null;
  tecnico?: TecnicoResumen | null;
  creadaPor: string | null;
  creadaEn: number;
  programadaPara: number | null;
  asignadaEn: number | null;
  resueltaEn: number | null;
  escaladaEn: number | null;
  motivoEscalacion: string | null;
  prioridad?: number;
  posicion?: number;
  posicionEnCola?: number;
  minutosEsperando?: number;
  minutosDesdeCreada?: number;
}

export interface Tecnico {
  id: string;
  nombre: string;
  sede: string;
  edificioBase: string;
  telefono: string | null;
  estado: EstadoTecnico;
  solicitudActualId: string | null;
}

export interface Cola {
  total: number;
  items: Solicitud[];
}

export interface PanelTecnico {
  tecnico: Tecnico;
  solicitudActual: Solicitud | null;
  colaSede: Cola;
}

export interface MisSolicitudes {
  activas: Solicitud[];
  historial: Solicitud[];
}

export interface Notificacion {
  id: string;
  solicitudId: string | null;
  tipo: 'TECNICO' | 'ESTADO' | 'RESUELTA';
  titulo: string;
  mensaje: string;
  creadaEn: number;
  leida: boolean;
}

export interface ResumenHoy {
  escaladasHoy: number;
  resueltasHoy: number;
  minutosPromedioResolucion: number | null;
}

export interface DemandaSede {
  sede: string;
  enCola: number;
  escaladas: number;
  enAtencion: number;
  resueltas24h: number;
  tecnicosTotal: number;
  tecnicosDisponibles: number;
  deficitTecnicos: number;
  minutosPromedioAsignacion: number | null;
  minutosPromedioResolucion: number | null;
  demandaPorEdificio: { edificio: string; total: number }[];
}
