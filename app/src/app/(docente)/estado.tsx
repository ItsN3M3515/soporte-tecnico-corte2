import { router } from 'expo-router';
import { View } from 'react-native';
import { useDatos } from '@/lib/useDatos';
import { fraseEstado, insigniaEstado, principal, salonTexto, ESTILO_TIPO } from '@/lib/formato';
import type { MisSolicitudes, Solicitud } from '@/lib/tipos';
import { BotonPrimario, Cargando, Cuerpo, Encabezado, Fila, Insignia, Pantalla, T, Tarjeta } from '@/ui/componentes';
import { Caja44 } from '@/ui/iconos';
import { Seguimiento } from '@/ui/Seguimiento';
import { C } from '@/ui/tema';

/**
 * Pestaña "Estado": el seguimiento en tiempo real de la solicitud activa más reciente
 * (misma vista que la pantalla 4). Si hay varias activas, las demás se listan debajo.
 */
export default function Estado() {
  const { datos: mias, cargando } = useDatos<MisSolicitudes>('/solicitudes/mias');
  const activa = principal(mias?.activas ?? []);
  const otras = (mias?.activas ?? []).filter((s) => s.id !== activa?.id);
  const { datos: detalle } = useDatos<Solicitud>(activa ? `/solicitudes/${activa.id}` : null);

  return (
    <Pantalla>
      <Encabezado titulo={activa ? `Solicitud #${activa.id}` : 'Estado'} onAtras={() => router.navigate('/inicio')} />
      <Cuerpo gap={22} abajo={120}>
        {cargando && !mias && <Cargando />}
        {activa && <Seguimiento s={detalle?.id === activa.id ? detalle : activa} />}
        {otras.length > 0 && (
          <View style={{ gap: 14 }}>
            <T peso="extra" tam={16}>
              Otras activas
            </T>
            {otras.map((s) => (
              <Fila
                key={s.id}
                icono={<Caja44 glifo={ESTILO_TIPO[s.tipo].glifo} degradado={ESTILO_TIPO[s.tipo].degradado} />}
                titulo={`${s.titulo} · ${salonTexto(s.salon)}`}
                subtitulo={fraseEstado(s)}
                derecha={<Insignia {...insigniaEstado(s)} />}
                onPress={() => router.push(`/seguimiento/${s.id}`)}
              />
            ))}
          </View>
        )}
        {mias && !activa && (
          <Tarjeta opacidad={0.8} radio={22} style={{ padding: 22, gap: 16 }}>
            <T peso="extra" tam={18}>
              No tienes solicitudes activas
            </T>
            <T tam={13} color={C.textoSuave}>
              Cuando reportes una falla o pidas un préstamo, aquí verás en tiempo real en qué va.
            </T>
            <BotonPrimario texto="Nueva solicitud" onPress={() => router.push('/nueva')} />
          </Tarjeta>
        )}
      </Cuerpo>
    </Pantalla>
  );
}
