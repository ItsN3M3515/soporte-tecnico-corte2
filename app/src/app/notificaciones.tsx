import { useEffect } from 'react';
import { Redirect, router } from 'expo-router';
import { View } from 'react-native';
import { useSesion } from '@/lib/sesion';
import { useDatos } from '@/lib/useDatos';
import { hace } from '@/lib/formato';
import type { Notificacion } from '@/lib/tipos';
import { Aviso, Cargando, Cuerpo, Encabezado, Pantalla, T, Tarjeta } from '@/ui/componentes';
import { Caja38 } from '@/ui/iconos';
import { C } from '@/ui/tema';

/** Pantalla "11 - Notificaciones". Al abrirla, los avisos quedan como leídos. */
const ICONO = {
  TECNICO: { glifo: 'check', degradado: 'verde' },
  ESTADO: { glifo: 'reloj', degradado: 'naranja' },
  RESUELTA: { glifo: 'check', degradado: 'morado' },
} as const;

export default function Notificaciones() {
  const { token, pedir } = useSesion();
  const { datos, error } = useDatos<{ noLeidas: number; items: Notificacion[] }>('/notificaciones');

  useEffect(() => {
    if (datos && datos.noLeidas > 0) pedir('/notificaciones/leidas', { metodo: 'POST' }).catch(() => undefined);
  }, [datos, pedir]);

  if (!token) return <Redirect href="/" />;
  return (
    <Pantalla>
      <Encabezado titulo="Notificaciones" onAtras={() => (router.canGoBack() ? router.back() : router.replace('/inicio'))} />
      <Cuerpo gap={12}>
        <Aviso texto={error} />
        {!datos && !error && <Cargando />}
        {datos?.items.length === 0 && (
          <T tam={13} color={C.textoSuave}>
            No tienes notificaciones todavía.
          </T>
        )}
        {datos?.items.map((n) => (
          <Tarjeta
            key={n.id}
            radio={16}
            sombra={null}
            onPress={n.solicitudId ? () => router.push(`/seguimiento/${n.solicitudId}`) : undefined}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 }}
          >
            <Caja38 glifo={ICONO[n.tipo].glifo} degradado={ICONO[n.tipo].degradado} />
            <View style={{ flex: 1, gap: 2 }}>
              <T peso="negrita" tam={13}>
                {n.titulo}
              </T>
              <T tam={11.5} color={C.textoSuave} lineas={2}>
                {n.mensaje}
              </T>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <T peso="medio" tam={10.5} color={C.textoTenue}>
                {hace(n.creadaEn)}
              </T>
              {!n.leida && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.naranja }} />}
            </View>
          </Tarjeta>
        ))}
      </Cuerpo>
    </Pantalla>
  );
}
