import type { Glifo, NombreDegradado } from '@/ui/iconos';

/** Servicios de la pantalla "9 - Servicios" (también los usa el buscador del Inicio). */
export const SERVICIOS: { titulo: string; subtitulo: string; glifo: Glifo; degradado: NombreDegradado; ruta: '/escanear' | '/cuando' | '/mantenimiento' | '/evento' | '/electrica'; claves: string }[] = [
  { titulo: 'Reportar falla de equipo', subtitulo: 'Video beam, PC, cables', glifo: 'alerta', degradado: 'naranja', ruta: '/escanear', claves: 'falla video beam pc computador cable hdmi proyector qr' },
  { titulo: 'Solicitar préstamo', subtitulo: 'Computadores y accesorios', glifo: 'portatil', degradado: 'morado', ruta: '/cuando', claves: 'prestamo préstamo portatil portátil pc computador extension extensión' },
  { titulo: 'Agendar mantenimiento', subtitulo: 'Revisión preventiva de salón', glifo: 'calendario', degradado: 'lavanda', ruta: '/mantenimiento', claves: 'mantenimiento revision revisión aire a/c mobiliario' },
  { titulo: 'Soporte para eventos', subtitulo: 'Configuración especial de salas', glifo: 'camara', degradado: 'verde', ruta: '/evento', claves: 'evento auditorio audio streaming video beam extra' },
  { titulo: 'Reportar falla eléctrica', subtitulo: 'Tomas, extensiones, cableado', glifo: 'enchufe', degradado: 'rojo', ruta: '/electrica', claves: 'electrica eléctrica energia energía toma cable enchufe luz' },
];

const normalizar = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function buscarServicios(texto: string) {
  const q = normalizar(texto.trim());
  if (!q) return SERVICIOS;
  return SERVICIOS.filter((s) => normalizar(`${s.titulo} ${s.subtitulo} ${s.claves}`).includes(q));
}
