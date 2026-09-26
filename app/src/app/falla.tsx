import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { useDatos } from '@/lib/useDatos';
import { useEnviarSolicitud } from '@/lib/enviar';
import { salonTexto } from '@/lib/formato';
import type { Equipo } from '@/lib/tipos';
import { Aviso, BotonPrimario, Campo, Cargando, Chips, Cuerpo, Encabezado, Etiqueta, Interruptor, Pantalla, T, Tarjeta } from '@/ui/componentes';
import { Icono } from '@/ui/iconos';
import { C } from '@/ui/tema';

/**
 * "¿Qué le pasa al equipo?": el paso entre escanear el QR y enviar el reporte.
 * Las opciones dependen del equipo que dijo el QR (las manda el backend: un video beam "no proyecta
 * imagen", un PC "sin internet"), así el técnico llega sabiendo qué revisar. "Otro problema" pide describirlo.
 */
export default function Falla() {
  const { codigo } = useLocalSearchParams<{ codigo: string }>();
  const { datos: equipo, error: errorEquipo } = useDatos<Equipo>(codigo ? `/equipos/${encodeURIComponent(codigo)}` : null);
  const [problema, setProblema] = useState<string | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [enClase, setEnClase] = useState(true);
  const { enviar, enviando, error } = useEnviarSolicitud();

  const esOtro = problema === 'OTRO';
  const listo = !!problema && (!esOtro || descripcion.trim().length > 0);

  return (
    <Pantalla>
      <Encabezado titulo="Reportar falla" resplandor={C.naranja} onAtras={() => (router.canGoBack() ? router.back() : router.replace('/inicio'))} />
      <Cuerpo arriba={28} gap={18}>
        {!equipo && !errorEquipo && <Cargando />}
        <Aviso texto={errorEquipo} />
        {equipo && (
          <>
            <Tarjeta radio={18} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
              <Icono nombre="detectado" />
              <View style={{ flex: 1, gap: 3 }}>
                <T peso="negrita" tam={14} lineas={1}>
                  {equipo.descripcion} · Placa {equipo.codigo}
                </T>
                <T tam={12} color={C.textoSuave}>
                  {salonTexto(equipo.salon)} · {equipo.edificio}
                </T>
              </View>
            </Tarjeta>

            <Etiqueta>¿Qué le pasa al {equipo.descripcion.toLowerCase()}?</Etiqueta>
            <Chips opciones={equipo.problemas ?? []} seleccion={problema ? [problema] : []} onCambio={setProblema} colorActivo={C.naranja} />

            <Etiqueta>{esOtro ? 'Describe el problema' : 'Cuéntanos más (opcional)'}</Etiqueta>
            <Campo
              value={descripcion}
              onChangeText={setDescripcion}
              placeholder={esOtro ? 'Ej: huele a quemado, hace un ruido raro...' : 'Ej: enciende pero se apaga a los 5 minutos'}
              maxLength={200}
              multilinea
            />

            <Interruptor texto="Hay clase en este momento" valor={enClase} onCambio={setEnClase} />
            <T tam={11.5} color={C.textoSuave} style={{ marginTop: -8 }}>
              Si hay clase, tu reporte pasa antes en la cola de prioridades.
            </T>

            <Aviso texto={error} />
            <BotonPrimario
              texto="Enviar reporte"
              cargando={enviando}
              deshabilitado={!listo}
              onPress={() =>
                enviar({
                  codigoEquipo: equipo.codigo,
                  tipo: 'FALLA_EQUIPO_FIJO',
                  claseEnCurso: enClase,
                  datos: { problema, descripcion: descripcion.trim() || undefined },
                })
              }
            />
          </>
        )}
      </Cuerpo>
    </Pantalla>
  );
}
