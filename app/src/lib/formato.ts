import type { Solicitud, TipoSolicitud } from './tipos';
import type { Glifo, NombreDegradado, TipoMini } from '@/ui/iconos';

/** Textos y fechas en español, como aparecen en el prototipo. */
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const MESES_TITULO = MESES.map((m) => m[0].toUpperCase() + m.slice(1));
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export function hora(ms: number): string {
  const d = new Date(ms);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h % 12 === 0 ? 12 : h % 12}:${m} ${h < 12 ? 'AM' : 'PM'}`;
}

/** "28 de marzo · 2:00 PM" */
export const fechaYHora = (ms: number) => `${new Date(ms).getDate()} de ${MESES[new Date(ms).getMonth()]} · ${hora(ms)}`;

/** "Hoy, 10:24 AM" / "Ayer, 3:00 PM" / "lunes 14 de abril, 9:00 AM" */
export function fechaRelativa(ms: number, ahora = Date.now()): string {
  const d = new Date(ms);
  const hoy = new Date(ahora);
  const dias = Math.round((new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86400000);
  if (dias === 0) return `Hoy, ${hora(ms)}`;
  if (dias === 1) return `Ayer, ${hora(ms)}`;
  if (dias === -1) return `Mañana, ${hora(ms)}`;
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}, ${hora(ms)}`;
}

/** "Ahora", "10 min", "2 h", "3 días" (columna derecha de Notificaciones). */
export function hace(ms: number, ahora = Date.now()): string {
  const min = Math.floor((ahora - ms) / 60000);
  if (min < 1) return 'Ahora';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? '1 día' : `${d} días`;
}

/** "Hace 3 días", "Hace 1 semana" (historial). */
export function haceLargo(ms: number, ahora = Date.now()): string {
  const min = Math.floor((ahora - ms) / 60000);
  if (min < 60) return min < 1 ? 'Hace un momento' : `Hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return d === 1 ? 'Ayer' : `Hace ${d} días`;
  const s = Math.floor(d / 7);
  return s === 1 ? 'Hace 1 semana' : `Hace ${s} semanas`;
}

/** "Salón 301" pero "Auditorio". */
export const salonTexto = (salon: string) => (/^\d/.test(salon) ? `Salón ${salon}` : salon);
/** "Edificio O" → "Edif. O" (detalle del seguimiento). */
export const edificioCorto = (edificio: string) => edificio.replace('Edificio ', 'Edif. ');
export const primerNombre = (nombre?: string | null) => (nombre ? nombre.split(' ')[0] : '');

/** Icono y color de cada tipo de solicitud (mismos colores de la pantalla "Servicios"). */
export const ESTILO_TIPO: Record<TipoSolicitud, { glifo: Glifo; degradado: NombreDegradado; mini: TipoMini }> = {
  FALLA_EQUIPO_FIJO: { glifo: 'alerta', degradado: 'naranja', mini: 'falla' },
  PRESTAMO_EQUIPO: { glifo: 'portatil', degradado: 'morado', mini: 'prestamo' },
  MANTENIMIENTO: { glifo: 'calendario', degradado: 'lavanda', mini: 'mantenimiento' },
  SOPORTE_EVENTO: { glifo: 'camara', degradado: 'verde', mini: 'evento' },
  FALLA_ELECTRICA: { glifo: 'enchufe', degradado: 'rojo', mini: 'electrica' },
};

/** Texto y color de la insignia según el estado (y si el técnico ya va en camino). */
export function insigniaEstado(s: Solicitud): { texto: string; color: string } {
  if (s.estado === 'EN_ATENCION') {
    return s.tecnico?.estado === 'OCUPADO' ? { texto: 'EN EL SALÓN', color: '#5B3B9E' } : { texto: 'EN CAMINO', color: '#F0AC4E' };
  }
  const mapa: Record<string, { texto: string; color: string }> = {
    PROGRAMADA: { texto: 'AGENDADA', color: '#6C74C9' },
    PENDIENTE: { texto: 'EN COLA', color: '#A6ADC7' },
    ASIGNADA: { texto: 'ASIGNADA', color: '#2E3192' },
    ESCALADA: { texto: 'ESCALADA', color: '#E8534A' },
    RESUELTA: { texto: 'RESUELTA', color: '#2AC17E' },
  };
  return mapa[s.estado];
}

/** Frase corta del estado ("Laura va en camino", "Edificio O · En camino"). */
export function fraseEstado(s: Solicitud): string {
  const t = primerNombre(s.tecnico?.nombre ?? s.tecnicoNombre);
  switch (s.estado) {
    case 'PROGRAMADA':
      return s.programadaPara ? `Agendada para ${fechaYHora(s.programadaPara)}` : 'Agendada';
    case 'PENDIENTE':
      return s.posicionEnCola ? `En cola · posición ${s.posicionEnCola}` : 'Buscando técnico disponible';
    case 'ASIGNADA':
      return t ? `${t} fue asignado` : 'Técnico asignado';
    case 'EN_ATENCION':
      return s.tecnico?.estado === 'OCUPADO' ? `${t} está en el salón` : `${t} va en camino`;
    case 'ESCALADA':
      return 'El coordinador la está revisando';
    default:
      return 'Resuelta';
  }
}

/** Paso del seguimiento (1 Pendiente · 2 Asignada · 3 En camino · 4 Resuelta). */
export function pasoSeguimiento(s: Solicitud): number {
  if (s.estado === 'RESUELTA') return 4;
  if (s.estado === 'EN_ATENCION') return 3;
  if (s.estado === 'ASIGNADA') return 2;
  return 1;
}

export function tituloSeguimiento(s: Solicitud): string {
  switch (s.estado) {
    case 'PROGRAMADA':
      return 'Solicitud agendada';
    case 'PENDIENTE':
      return 'Buscando técnico';
    case 'ESCALADA':
      return 'Revisión del coordinador';
    case 'ASIGNADA':
      return 'Técnico asignado';
    case 'EN_ATENCION':
      return s.tecnico?.estado === 'OCUPADO' ? 'Técnico en el salón' : 'Técnico en camino';
    default:
      return 'Solicitud resuelta';
  }
}

/** La solicitud "principal" para el Inicio y la pestaña Estado: la más reciente que ya está en curso (no agendada). */
export function principal(activas: Solicitud[]): Solicitud | null {
  return activas.find((s) => s.estado !== 'PROGRAMADA') ?? activas[0] ?? null;
}
