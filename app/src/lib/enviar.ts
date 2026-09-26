import { useState } from 'react';
import { router } from 'expo-router';
import { useSesion } from './sesion';
import type { Solicitud } from './tipos';

/** Envía una solicitud y, si todo sale bien, abre "7 - Confirmación de envío". */
export function useEnviarSolicitud() {
  const { pedir } = useSesion();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enviar = async (cuerpo: Record<string, unknown>) => {
    setEnviando(true);
    setError(null);
    try {
      const s = await pedir<Solicitud>('/solicitudes', { metodo: 'POST', cuerpo });
      router.replace({ pathname: '/confirmacion', params: { id: s.id } });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEnviando(false);
    }
  };
  return { enviar, enviando, error, setError };
}
