import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useSesion } from './sesion';
import { useEventos } from './tiempoReal';

/**
 * Pide `ruta` al backend al entrar a la pantalla y la vuelve a pedir cuando llega
 * un evento en tiempo real (sin recargar ni preguntar cada X segundos).
 */
export function useDatos<T>(ruta: string | null) {
  const { pedir, token } = useSesion();
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const vigente = useRef(ruta);
  vigente.current = ruta;

  const recargar = useCallback(async () => {
    if (!ruta || !token) return;
    try {
      const r = await pedir<T>(ruta);
      if (vigente.current === ruta) {
        setDatos(r);
        setError(null);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCargando(false);
    }
  }, [pedir, ruta, token]);

  useFocusEffect(
    useCallback(() => {
      recargar();
    }, [recargar]),
  );
  useEffect(() => {
    recargar();
  }, [recargar]);
  const conectado = useEventos(() => {
    recargar();
  });

  return { datos, error, cargando, recargar, conectado };
}
