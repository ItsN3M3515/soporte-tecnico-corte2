import { Redirect, router } from 'expo-router';
import { useSesion } from '@/lib/sesion';
import { useDatos } from '@/lib/useDatos';
import { ESTILO_TIPO, fraseEstado, haceLargo, insigniaEstado, salonTexto } from '@/lib/formato';
import type { MisSolicitudes, Solicitud } from '@/lib/tipos';
import { Aviso, Cargando, Cuerpo, Encabezado, Fila, Insignia, Pantalla, T } from '@/ui/componentes';
import { Caja44 } from '@/ui/iconos';
import { C } from '@/ui/tema';

/** Pantalla "8 - Mis solicitudes": activas arriba e historial debajo. */
export default function PantallaMisSolicitudes() {
  const { token } = useSesion();
  const { datos, error } = useDatos<MisSolicitudes>('/solicitudes/mias');
  if (!token) return <Redirect href="/" />;
  return (
    <Pantalla>
      <Encabezado titulo="Mis solicitudes" onAtras={() => (router.canGoBack() ? router.back() : router.replace('/perfil'))} />
      <Cuerpo gap={14}>
        <Aviso texto={error} />
        {!datos && !error && <Cargando />}
        {datos && (
          <>
            <T peso="extra" tam={16}>
              Activas
            </T>
            {datos.activas.length === 0 && (
              <T tam={12.5} color={C.textoSuave}>
                No tienes solicitudes activas.
              </T>
            )}
            {datos.activas.map((s) => (
              <FilaSolicitud key={s.id} s={s} subtitulo={`${s.edificio} · ${fraseEstado(s)}`} />
            ))}
            <T peso="extra" tam={16}>
              Historial
            </T>
            {datos.historial.length === 0 && (
              <T tam={12.5} color={C.textoSuave}>
                Aún no hay solicitudes resueltas.
              </T>
            )}
            {datos.historial.map((s) => (
              <FilaSolicitud key={s.id} s={s} subtitulo={`${haceLargo(s.resueltaEn ?? s.creadaEn)} · Resuelta`} />
            ))}
          </>
        )}
      </Cuerpo>
    </Pantalla>
  );
}

function FilaSolicitud({ s, subtitulo }: { s: Solicitud; subtitulo: string }) {
  const estilo = ESTILO_TIPO[s.tipo];
  return (
    <Fila
      icono={<Caja44 glifo={estilo.glifo} degradado={estilo.degradado} />}
      titulo={`${s.titulo} · ${salonTexto(s.salon)}`}
      subtitulo={subtitulo}
      derecha={<Insignia {...insigniaEstado(s)} />}
      onPress={() => router.push(`/seguimiento/${s.id}`)}
    />
  );
}
