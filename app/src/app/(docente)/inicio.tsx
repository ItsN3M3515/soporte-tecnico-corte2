import { useState } from 'react';
import { router } from 'expo-router';
import { Platform, StyleSheet, TextInput, View } from 'react-native';
import { useSesion } from '@/lib/sesion';
import { useDatos } from '@/lib/useDatos';
import { buscarServicios } from '@/lib/servicios';
import { fraseEstado, primerNombre, principal, salonTexto } from '@/lib/formato';
import type { MisSolicitudes, Notificacion } from '@/lib/tipos';
import { Cuerpo, Fila, Pantalla, T, Tarjeta } from '@/ui/componentes';
import { EncabezadoInicio } from '@/ui/EncabezadoInicio';
import { Caja44, Caja48, Icono, Mancha58 } from '@/ui/iconos';
import { C, F, SOMBRA } from '@/ui/tema';

const GLIFO_48 = {
  FALLA_EQUIPO_FIJO: 'alerta',
  PRESTAMO_EQUIPO: 'portatil',
  FALLA_ELECTRICA: 'enchufe',
  MANTENIMIENTO: 'calendarioLinea',
  SOPORTE_EVENTO: 'camara',
} as const;

/** Pantalla "1 - Inicio" del prototipo. */
export default function Inicio() {
  const { perfil } = useSesion();
  const [busqueda, setBusqueda] = useState('');
  const { datos: mias } = useDatos<MisSolicitudes>('/solicitudes/mias');
  const { datos: avisos } = useDatos<{ noLeidas: number; items: Notificacion[] }>('/notificaciones');
  const activa = principal(mias?.activas ?? []);
  const nombre = perfil?.nombre ?? '';

  return (
    <Pantalla>
      <EncabezadoInicio saludo="¡Hola de nuevo! 👋" nombre={nombre} onCampana={() => router.push('/notificaciones')} hayNuevas={(avisos?.noLeidas ?? 0) > 0}>
        <View style={est.buscador}>
          <Icono nombre="buscar" />
          <TextInput
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar un servicio..."
            placeholderTextColor="#D8DEEE"
            style={[est.entrada, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]}
            accessibilityLabel="Buscar un servicio"
          />
        </View>
      </EncabezadoInicio>

      <Cuerpo arriba={22} gap={26} abajo={120}>
        {busqueda.trim() ? (
          <View style={{ gap: 14 }}>
            <T peso="extra" tam={21}>
              Resultados
            </T>
            {buscarServicios(busqueda).map((s) => (
              <Fila key={s.ruta} icono={<Caja44 glifo={s.glifo} degradado={s.degradado} />} titulo={s.titulo} subtitulo={s.subtitulo} derecha={<Icono nombre="chevron16" />} onPress={() => router.push(s.ruta)} />
            ))}
            {buscarServicios(busqueda).length === 0 && (
              <T tam={13} color={C.textoSuave}>
                No encontramos “{busqueda}”. Revisa la pestaña Servicios.
              </T>
            )}
          </View>
        ) : (
          <>
            <T peso="extra" tam={21}>
              ¿Qué necesitas hoy?
            </T>
            <View style={{ gap: 14 }}>
              <Opcion tipo="falla" titulo="Reportar falla de equipo" subtitulo="Video beam, cables, PCs que no funcionan" onPress={() => router.push('/escanear')} />
              <Opcion tipo="prestamo" titulo="Solicitar préstamo de equipo" subtitulo="PC, extensión, u otro recurso" onPress={() => router.push('/cuando')} />
            </View>
          </>
        )}

        {activa && !busqueda.trim() && (
          <View style={{ gap: 26 }}>
            <T peso="extra" tam={18}>
              Tu solicitud activa
            </T>
            <Tarjeta onPress={() => router.push(`/seguimiento/${activa.id}`)} opacidad={0.85} radio={20} borde={C.naranja} bordeAncho={1.5} sombra={SOMBRA.naranja} style={est.banner}>
              <Caja48 glifo={GLIFO_48[activa.tipo]} />
              <View style={{ flex: 1, gap: 3 }}>
                <T peso="negrita" tam={14.5} lineas={1}>
                  {activa.titulo} · {salonTexto(activa.salon)}
                </T>
                <T tam={12.5} color={C.textoSuave} lineas={1}>
                  {fraseEstado(activa)}
                </T>
              </View>
              <Icono nombre="chevron18" />
            </Tarjeta>
            {mias && mias.activas.length > 1 && (
              <T peso="negrita" tam={13} color={C.textoSuave} style={{ marginTop: -14 }}>
                +{mias.activas.length - 1} más en “Mis solicitudes” (pestaña Perfil)
              </T>
            )}
          </View>
        )}
        {!activa && !busqueda.trim() && perfil && (
          <T tam={12.5} color={C.textoSuave}>
            {primerNombre(nombre)}, no tienes solicitudes activas. Cuando pidas algo, aquí verás quién va en camino.
          </T>
        )}
      </Cuerpo>
    </Pantalla>
  );
}

function Opcion({ tipo, titulo, subtitulo, onPress }: { tipo: 'falla' | 'prestamo'; titulo: string; subtitulo: string; onPress: () => void }) {
  return (
    <Tarjeta onPress={onPress} opacidad={0.75} radio={22} sombra={SOMBRA.tarjeta} style={est.opcion}>
      <Mancha58 tipo={tipo} />
      <View style={{ flex: 1, gap: 4 }}>
        <T peso="negrita" tam={15.5}>
          {titulo}
        </T>
        <T tam={12.5} color={C.textoSuave}>
          {subtitulo}
        </T>
      </View>
      <Icono nombre="chevron18" />
    </Tarjeta>
  );
}

const est = StyleSheet.create({
  buscador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 18,
    height: 48,
  },
  entrada: { flex: 1, color: C.blanco, fontFamily: F.regular, fontSize: 14.5, paddingVertical: 0 },
  opcion: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, minHeight: 100 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 18 },
});
