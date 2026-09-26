import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useSesion } from '@/lib/sesion';
import { useDatos } from '@/lib/useDatos';
import type { Solicitud } from '@/lib/tipos';
import { Aviso, Cargando, Cuerpo, Encabezado, Pantalla } from '@/ui/componentes';
import { Seguimiento } from '@/ui/Seguimiento';

/** Pantalla "4 - Seguimiento en tiempo real". Se actualiza sola con cada evento del backend. */
export default function PantallaSeguimiento() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useSesion();
  const { datos, error } = useDatos<Solicitud>(`/solicitudes/${id}`);
  if (!token) return <Redirect href="/" />;
  return (
    <Pantalla>
      <Encabezado titulo={`Solicitud #${id}`} onAtras={() => (router.canGoBack() ? router.back() : router.replace('/inicio'))} />
      <Cuerpo gap={22}>
        <Aviso texto={error} />
        {datos ? <Seguimiento s={datos} /> : !error && <Cargando />}
      </Cuerpo>
    </Pantalla>
  );
}
