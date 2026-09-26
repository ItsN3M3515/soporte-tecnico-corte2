import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSesion } from '@/lib/sesion';
import { salonTexto } from '@/lib/formato';
import type { Equipo, Ubicaciones } from '@/lib/tipos';
import { Aviso, BotonPrimario, Chips, Degradado, Encabezado, Fila, Hoja, Pantalla, Resplandor, T, Tarjeta } from '@/ui/componentes';
import { Caja44, Icono } from '@/ui/iconos';
import { C } from '@/ui/tema';
import { BotonSubirQR, EscanerWeb, type EstadoCamaraWeb } from '@/ui/EscanerWeb';

/**
 * Pantalla "3a - Escanear QR del equipo".
 * Retos "Reservar mediante QR" y "QR asociado al PC": la cámara lee SOPORTE:v1:<código>,
 * el backend dice qué equipo es y dónde está (DetectedCard), y "Reportar falla" lleva a decir QUÉ le pasa (falla.tsx).
 * Si el QR está dañado: "Buscar manualmente por edificio y salón".
 *
 * Dónde se lee el QR:
 *  - celular (Expo Go): expo-camera;
 *  - navegador: la cámara del computador con jsQR (EscanerWeb) o subiendo la foto del QR.
 * Con `?para=prestamo` (se abre desde la pantalla de préstamo) el QR solo sirve para saber el salón.
 */
export default function Escanear() {
  const { pedir, perfil } = useSesion();
  const { para, modo } = useLocalSearchParams<{ para?: string; modo?: string }>();
  const paraPrestamo = para === 'prestamo';
  const [camaraWeb, setCamaraWeb] = useState<EstadoCamaraWeb>('iniciando');
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [equipo, setEquipo] = useState<Equipo | null>(null);
  const [errorQr, setErrorQr] = useState<string | null>(null);
  const [verManual, setVerManual] = useState(false);
  const leyendo = useRef(false);
  const camara = Platform.OS !== 'web';

  useEffect(() => {
    if (camara && permiso && !permiso.granted && permiso.canAskAgain) pedirPermiso();
  }, [camara, permiso, pedirPermiso]);

  const alLeer = useCallback(
    async ({ data }: { data: string }) => {
      if (leyendo.current || equipo) return;
      leyendo.current = true;
      try {
        setEquipo(await pedir<Equipo>(`/qr/resolver?qr=${encodeURIComponent(data)}`));
        setErrorQr(null);
      } catch (e) {
        setErrorQr((e as Error).message);
      } finally {
        setTimeout(() => {
          leyendo.current = false;
        }, 1500);
      }
    },
    [pedir, equipo],
  );

  return (
    <Pantalla
      fondo={C.escaner}
      pie={
        equipo && (
        <View style={est.pie}>
          <Tarjeta opacidad={0.96} radio={20} sombra="0px 10px 30px rgba(0,0,0,0.30)" style={est.detectado}>
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
          {paraPrestamo ? (
            <BotonPrimario
              texto="Pedir el préstamo para este salón"
              onPress={() => {
                const destino = { pathname: '/prestamo' as const, params: { modo: modo ?? 'ahora', edificio: equipo.edificio, salon: equipo.salon } };
                // Vuelve a la pantalla de préstamo que abrió el escáner (sin apilar otra) con el salón elegido.
                if (router.canDismiss()) router.dismissTo(destino);
                else router.replace(destino);
              }}
            />
          ) : (
            <>
              <BotonPrimario texto="Reportar falla de este equipo" onPress={() => router.push({ pathname: '/falla', params: { codigo: equipo.codigo } })} />
              <Pressable
                onPress={() => router.push({ pathname: '/prestamo', params: { modo: 'ahora', edificio: equipo.edificio, salon: equipo.salon } })}
                accessibilityRole="button"
                style={{ alignSelf: 'center', padding: 4 }}
              >
                <T peso="negrita" tam={13.5} color={C.naranja}>
                  Reservar un equipo para este salón
                </T>
              </Pressable>
            </>
          )}
          <Pressable onPress={() => setEquipo(null)} style={{ alignSelf: 'center', padding: 4 }}>
            <T peso="negrita" tam={13} color={C.inactivo}>
              Escanear otro equipo
            </T>
          </Pressable>
        </View>
        )
      }
    >
      <Encabezado titulo="Escanear equipo" extraAbajo={14} costura={false} resplandor={null} oscuro onAtras={() => (router.canGoBack() ? router.back() : router.replace('/inicio'))} />
      <View style={[est.cuerpo, equipo ? { paddingBottom: 260 } : null]}>
        <T peso="semi" tam={16} color={C.blanco} alinear="center" style={{ maxWidth: 300 }}>
          {paraPrestamo ? 'Escanea el QR de cualquier equipo del salón' : 'Apunta al código QR de la placa del equipo'}
        </T>

        <View style={est.marco}>
          <Resplandor diametro={280} color={C.naranja} opacidad={0.15} desenfoque={50} x={-15} y={-15} />
          <View style={est.visor}>
            {camara && permiso?.granted && !equipo && (
              <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={alLeer} />
            )}
            {!camara && <EscanerWeb activo={!equipo && !verManual} onLeer={(data) => alLeer({ data })} onEstado={setCamaraWeb} />}
            {(equipo || (camara ? !permiso?.granted : camaraWeb !== 'activa')) && <Icono nombre="escanearCentro" />}
          </View>
          <Esquina estilo={{ left: 0, top: 0 }} />
          <Esquina estilo={{ right: 0, top: 0, transform: [{ scaleX: -1 }] }} />
          <Esquina estilo={{ left: 0, bottom: 0, transform: [{ scaleY: -1 }] }} />
          <Esquina estilo={{ right: 0, bottom: 0, transform: [{ scaleX: -1 }, { scaleY: -1 }] }} />
        </View>

        {!camara && !equipo && (
          <View style={{ alignItems: 'center', gap: 14, marginTop: -20 }}>
            <T tam={12.5} color={C.inactivo} alinear="center" style={{ maxWidth: 300 }}>
              {camaraWeb === 'activa'
                ? 'Cámara activa: acerca el QR al recuadro.'
                : camaraWeb === 'iniciando'
                  ? 'Permite el acceso a la cámara para leer el QR.'
                  : 'No encontramos una cámara. Sube una foto del QR o búscalo manualmente.'}
            </T>
            <BotonSubirQR onLeer={(data) => alLeer({ data })} onError={setErrorQr} />
          </View>
        )}
        {camara && permiso && !permiso.granted && (
          <Pressable onPress={pedirPermiso}>
            <T peso="negrita" tam={13} color={C.naranja}>
              Permitir el uso de la cámara
            </T>
          </Pressable>
        )}
        <Aviso texto={errorQr} />

        {!equipo && (
        <Pressable onPress={() => setVerManual(true)} accessibilityRole="button" style={{ alignItems: 'center', gap: 6 }}>
          <T peso="medio" tam={13} color={C.inactivo}>
            ¿El QR está dañado o no lo puedes leer?
          </T>
          <T peso="negrita" tam={14} color={C.naranja}>
            Buscar manualmente por edificio y salón
          </T>
        </Pressable>
        )}
      </View>

      <BusquedaManual
        visible={verManual}
        sede={perfil?.sede ?? null}
        onCerrar={() => setVerManual(false)}
        onElegir={(e) => {
          setEquipo(e);
          setVerManual(false);
        }}
      />
    </Pantalla>
  );
}

function Esquina({ estilo }: { estilo: object }) {
  return (
    <View style={[est.esquina, estilo]} pointerEvents="none">
      <Degradado g="naranja" angulo={90} style={{ position: 'absolute', left: 0, top: 0, width: 36, height: 4, borderRadius: 2 }} />
      <View style={{ position: 'absolute', left: 0, top: 0, width: 4, height: 36, borderRadius: 2, backgroundColor: C.naranja }} />
    </View>
  );
}

/** Búsqueda manual: edificio → salón → equipo registrado en ese salón. */
function BusquedaManual({ visible, sede, onCerrar, onElegir }: { visible: boolean; sede: string | null; onCerrar: () => void; onElegir: (e: Equipo) => void }) {
  const { pedir } = useSesion();
  const [ubicaciones, setUbicaciones] = useState<Ubicaciones[] | null>(null);
  const [edificio, setEdificio] = useState<string | null>(null);
  const [salon, setSalon] = useState<string | null>(null);
  const [equipos, setEquipos] = useState<Equipo[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && !ubicaciones) pedir<Ubicaciones[]>('/ubicaciones').then(setUbicaciones, (e) => setError((e as Error).message));
  }, [visible, ubicaciones, pedir]);

  useEffect(() => {
    setEquipos(null);
    if (!edificio || !salon) return;
    pedir<Equipo[]>(`/equipos?edificio=${encodeURIComponent(edificio)}&salon=${encodeURIComponent(salon)}`).then(setEquipos, (e) => setError((e as Error).message));
  }, [edificio, salon, pedir]);

  const edificios = (ubicaciones ?? []).filter((u) => !sede || u.sede === sede).flatMap((u) => u.edificios);
  const salones = edificios.find((e) => e.edificio === edificio)?.salones ?? [];

  return (
    <Hoja visible={visible} onCerrar={onCerrar} titulo="Buscar equipo">
      <Aviso texto={error} />
      <T peso="negrita" tam={13.5}>
        Edificio
      </T>
      <Chips
        opciones={edificios.map((e) => ({ valor: e.edificio, texto: e.edificio }))}
        seleccion={edificio ? [edificio] : []}
        onCambio={(v) => {
          setEdificio(v);
          setSalon(null);
        }}
        colorActivo={C.naranja}
      />
      {edificio && (
        <>
          <T peso="negrita" tam={13.5}>
            Salón
          </T>
          <Chips opciones={salones.map((s) => ({ valor: s, texto: s }))} seleccion={salon ? [salon] : []} onCambio={setSalon} colorActivo={C.naranja} />
        </>
      )}
      {equipos && (
        <>
          <T peso="negrita" tam={13.5}>
            ¿Cuál equipo falla?
          </T>
          {equipos.map((e) => (
            <Fila
              key={e.codigo}
              icono={<Caja44 glifo={e.descripcion.startsWith('PC') ? 'portatil' : 'alerta'} degradado="naranja" />}
              titulo={e.descripcion}
              subtitulo={`Placa ${e.codigo}`}
              derecha={<Icono nombre="chevron16" />}
              onPress={() => onElegir(e)}
            />
          ))}
        </>
      )}
    </Hoja>
  );
}

const est = StyleSheet.create({
  cuerpo: { alignItems: 'center', paddingTop: 52, paddingHorizontal: 20, gap: 52, paddingBottom: 40 },
  marco: { width: 250, height: 250 },
  visor: { position: 'absolute', left: 14, top: 14, right: 14, bottom: 14, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  esquina: { position: 'absolute', width: 36, height: 36 },
  pie: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingBottom: 30, paddingTop: 16, gap: 14, backgroundColor: C.escaner },
  detectado: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 18, borderWidth: 0 },
});
