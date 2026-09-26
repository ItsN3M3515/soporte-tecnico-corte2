import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useSesion } from './sesion';

/**
 * Reto "Reporte en tiempo real": UNA conexión Socket.IO por sesión, compartida por
 * todas las pantallas. El servidor decide las salas según el rol (admin, sede,
 * técnico, usuario). Cada pantalla se suscribe con useEventos y vuelve a pedir sus datos.
 */
export const EVENTOS = [
  'solicitud:creada',
  'solicitud:asignada',
  'solicitud:aceptada',
  'tecnico:llego',
  'solicitud:resuelta',
  'solicitud:escalada',
  'solicitud:retirada',
  'solicitud:devuelta',
  'solicitud:activada',
  'notificacion:nueva',
] as const;
export type NombreEvento = (typeof EVENTOS)[number];
type Oyente = (evento: NombreEvento, datos: any) => void;

const Contexto = createContext<{ conectado: boolean; suscribir: (o: Oyente) => () => void } | null>(null);

export function ProveedorTiempoReal({ children }: { children: ReactNode }) {
  const { apiUrl, token } = useSesion();
  const [conectado, setConectado] = useState(false);
  const oyentes = useRef(new Set<Oyente>());

  useEffect(() => {
    if (!token) return undefined;
    const socket: Socket = io(apiUrl, { auth: { token }, transports: ['websocket'] });
    socket.on('connect', () => setConectado(true));
    socket.on('disconnect', () => setConectado(false));
    EVENTOS.forEach((evento) => socket.on(evento, (datos) => oyentes.current.forEach((o) => o(evento, datos))));
    return () => {
      socket.close();
      setConectado(false);
    };
  }, [apiUrl, token]);

  const suscribir = (o: Oyente) => {
    oyentes.current.add(o);
    return () => {
      oyentes.current.delete(o);
    };
  };

  return <Contexto.Provider value={{ conectado, suscribir }}>{children}</Contexto.Provider>;
}

export function useEventos(alRecibir: Oyente) {
  const ctx = useContext(Contexto);
  const ref = useRef(alRecibir);
  ref.current = alRecibir;
  useEffect(() => ctx?.suscribir((e, d) => ref.current(e, d)), [ctx]);
  return ctx?.conectado ?? false;
}
