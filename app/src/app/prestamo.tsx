import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useEnviarSolicitud } from '@/lib/enviar';
import { fechaYHora, salonTexto } from '@/lib/formato';
import { Aviso, BotonPrimario, Campo, CampoSelector, Chips, Contador, Cuerpo, Encabezado, Etiqueta, Interruptor, Pantalla, T } from '@/ui/componentes';
import { Icono } from '@/ui/iconos';
import { SelectorFecha, SelectorLugar, type Lugar } from '@/ui/Selectores';
import { C } from '@/ui/tema';

/**
 * Pantallas "3c - Préstamo: configuración" y "3c - Préstamo (agendado)".
 * modo=agendado agrega "Fecha y hora del evento" (abre el CalendarOverlay).
 */
type Recurso = 'PORTATIL' | 'EXTENSION' | 'OTRO';
const RECURSOS: { valor: Recurso; texto: string; contador: string }[] = [
  { valor: 'PORTATIL', texto: 'Computador', contador: 'Computadores' },
  { valor: 'EXTENSION', texto: 'Extensión', contador: 'Extensiones' },
  { valor: 'OTRO', texto: 'Otro', contador: 'Unidades' },
];

export default function Prestamo() {
  const { modo, edificio, salon } = useLocalSearchParams<{ modo?: string; edificio?: string; salon?: string }>();
  const agendado = modo === 'agendado';
  // Si viene del escáner ("Reservar mediante QR"), el salón ya está elegido.
  const [lugar, setLugar] = useState<Lugar | null>(edificio && salon ? { edificio, salon } : null);
  useEffect(() => {
    if (edificio && salon) setLugar({ edificio, salon });
  }, [edificio, salon]);
  const [recurso, setRecurso] = useState<Recurso>('PORTATIL');
  const [cantidad, setCantidad] = useState(1);
  const [internet, setInternet] = useState(false);
  const [software, setSoftware] = useState(false);
  const [cuales, setCuales] = useState('');
  const [fecha, setFecha] = useState<number | null>(null);
  const [verLugar, setVerLugar] = useState(false);
  const [verFecha, setVerFecha] = useState(false);
  const { enviar, enviando, error } = useEnviarSolicitud();

  const listo = lugar && (!agendado || fecha) && (!software || cuales.trim());

  return (
    <Pantalla>
      <Encabezado titulo="Préstamo de equipo" onAtras={() => (router.canGoBack() ? router.back() : router.replace('/inicio'))} />
      <Cuerpo arriba={26} gap={20}>
        <Etiqueta>Edificio y salón</Etiqueta>
        <CampoSelector valor={lugar && `${lugar.edificio}, ${salonTexto(lugar.salon)}`} placeholder="Ej: Edificio K, Salón 204" onPress={() => setVerLugar(true)} />
        <Pressable
          onPress={() => router.push({ pathname: '/escanear', params: { para: 'prestamo', modo: agendado ? 'agendado' : 'ahora' } })}
          accessibilityRole="button"
          style={{ marginTop: -10, alignSelf: 'flex-start' }}
        >
          <T peso="negrita" tam={13} color={C.naranja}>
            o escanea el QR de un equipo del salón
          </T>
        </Pressable>

        <Etiqueta>Cantidad de equipos</Etiqueta>
        <View style={{ gap: 12 }}>
          <Chips opciones={RECURSOS} seleccion={[recurso]} onCambio={setRecurso} colorActivo={C.naranja} />
          <Contador texto={RECURSOS.find((r) => r.valor === recurso)?.contador ?? ''} valor={cantidad} onCambio={setCantidad} />
        </View>

        <Etiqueta>Configuración necesaria</Etiqueta>
        <Interruptor texto="Requiere conexión a internet" valor={internet} onCambio={setInternet} />
        <Interruptor texto="Acceso a páginas/software específico" valor={software} onCambio={setSoftware} />
        <Campo value={cuales} onChangeText={setCuales} placeholder="Ej: acceso a Autodesk, sin redes sociales..." editable={software} style={!software ? { opacity: 0.6 } : null} />

        {agendado && (
          <>
            <Etiqueta>Fecha y hora del evento</Etiqueta>
            <CampoSelector valor={fecha ? fechaYHora(fecha) : null} placeholder="Elige fecha y hora" icono={<Icono nombre="calendarioPequeno" />} derecha={<Icono nombre="chevronAbajo" />} onPress={() => setVerFecha(true)} />
          </>
        )}

        <Aviso texto={error} />
        <BotonPrimario
          texto="Enviar solicitud"
          cargando={enviando}
          deshabilitado={!listo}
          onPress={() =>
            lugar &&
            enviar({
              tipo: 'PRESTAMO_EQUIPO',
              ubicacion: lugar,
              datos: { recurso, cantidad, requiereInternet: internet, requiereSoftware: software, software: software ? cuales : null },
              ...(agendado ? { programadaPara: fecha } : {}),
            })
          }
        />
      </Cuerpo>

      <SelectorLugar
        visible={verLugar}
        inicial={lugar}
        onCerrar={() => setVerLugar(false)}
        onElegir={(l) => {
          setLugar(l);
          setVerLugar(false);
        }}
      />
      {agendado && (
        <SelectorFecha
          visible={verFecha}
          valor={fecha}
          onCerrar={() => setVerFecha(false)}
          onElegir={(ms) => {
            setFecha(ms);
            setVerFecha(false);
          }}
        />
      )}
    </Pantalla>
  );
}
