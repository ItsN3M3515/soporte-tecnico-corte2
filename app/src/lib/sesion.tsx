import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Perfil } from './tipos';
import { urlPorDefecto } from './config';

/**
 * Sesión en memoria (token + perfil + URL del servidor) y cliente HTTP.
 * La app es un adaptador de entrada más del sistema: no tiene reglas de
 * negocio, solo llama a la API y muestra lo que responde.
 */
interface Sesion {
  apiUrl: string;
  setApiUrl: (url: string) => void;
  token: string | null;
  perfil: Perfil | null;
  iniciar: (usuario: string, clave: string) => Promise<Perfil>;
  cerrar: () => void;
  pedir: <T>(ruta: string, opciones?: { metodo?: 'GET' | 'POST'; cuerpo?: unknown }) => Promise<T>;
  rutaInicio: (rol: Perfil['rol']) => '/inicio' | '/tecnico' | '/coordinador';
}

const Contexto = createContext<Sesion | null>(null);

export class ErrorApi extends Error {
  constructor(
    mensaje: string,
    public status: number,
  ) {
    super(mensaje);
  }
}

async function llamar<T>(apiUrl: string, ruta: string, token: string | null, metodo = 'GET', cuerpo?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${apiUrl.replace(/\/$/, '')}/api${ruta}`, {
      method: metodo,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
  } catch {
    throw new ErrorApi(`No hay conexión con el servidor (${apiUrl}). ¿Está corriendo el backend?`, 0);
  }
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) throw new ErrorApi(datos.error ?? `Error ${res.status}`, res.status);
  return datos as T;
}

/** Pantalla principal según el rol: docente o estudiante → Inicio, técnico → su vista, admin → panel del coordinador. */
const rutaInicio = (rol: Perfil['rol']) => (rol === 'TECNICO' ? '/tecnico' : rol === 'ADMIN' ? '/coordinador' : '/inicio') as '/inicio' | '/tecnico' | '/coordinador';

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [apiUrl, setApiUrl] = useState(urlPorDefecto());
  const [token, setToken] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);

  const iniciar = useCallback(
    async (usuario: string, clave: string) => {
      const r = await llamar<{ token: string; perfil: Perfil }>(apiUrl, '/auth/login', null, 'POST', { usuario, clave });
      setToken(r.token);
      setPerfil(r.perfil);
      return r.perfil;
    },
    [apiUrl],
  );

  const cerrar = useCallback(() => {
    setToken(null);
    setPerfil(null);
  }, []);

  const pedir = useCallback(
    <T,>(ruta: string, opciones: { metodo?: 'GET' | 'POST'; cuerpo?: unknown } = {}) =>
      llamar<T>(apiUrl, ruta, token, opciones.metodo ?? 'GET', opciones.cuerpo),
    [apiUrl, token],
  );

  const valor = useMemo(
    () => ({ apiUrl, setApiUrl, token, perfil, iniciar, cerrar, pedir, rutaInicio }),
    [apiUrl, token, perfil, iniciar, cerrar, pedir],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSesion(): Sesion {
  const s = useContext(Contexto);
  if (!s) throw new Error('useSesion debe usarse dentro de ProveedorSesion');
  return s;
}
