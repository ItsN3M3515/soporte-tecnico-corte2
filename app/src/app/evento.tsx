import { useState } from 'react';
import { router } from 'expo-router';
import { useEnviarSolicitud } from '@/lib/enviar';
import { fechaRelativa, salonTexto } from '@/lib/formato';
import { Aviso, BotonPrimario, Campo, CampoSelector, Chips, Cuerpo, Encabezado, Etiqueta, Pantalla } from '@/ui/componentes';
import { SelectorFecha, SelectorLugar, type Lugar } from '@/ui/Selectores';
import { C } from '@/ui/tema';

/** Pantalla "13 - Soporte para eventos". Los requerimientos admiten varios a la vez. */
type Req = 'AUDIO' | 'VIDEO_BEAM_EXTRA' | 'STREAMING';
const REQUERIMIENTOS: { valor: Req; texto: string }[] = [
  { valor: 'AUDIO', texto: 'Audio' },
  { valor: 'VIDEO_BEAM_EXTRA', texto: 'Video beam extra' },
  { valor: 'STREAMING', texto: 'Streaming' },
];

export default function Evento() {
  const [nombre, setNombre] = useState('');
  const [lugar, setLugar] = useState<Lugar | null>(null);
  const [fecha, setFecha] = useState<number | null>(null);
  const [reqs, setReqs] = useState<Req[]>([]);
  const [ver, setVer] = useState<'lugar' | 'fecha' | null>(null);
  const { enviar, enviando, error } = useEnviarSolicitud();
  const alternar = (r: Req) => setReqs((xs) => (xs.includes(r) ? xs.filter((x) => x !== r) : [...xs, r]));

  return (
    <Pantalla>
      <Encabezado titulo="Soporte para eventos" resplandor={C.verde} onAtras={() => (router.canGoBack() ? router.back() : router.replace('/servicios'))} />
      <Cuerpo arriba={28} gap={18}>
        <Etiqueta>Nombre del evento</Etiqueta>
        <Campo value={nombre} onChangeText={setNombre} placeholder="Ej: Semana de la Ingeniería" maxLength={80} />
        <Etiqueta>Salón o auditorio</Etiqueta>
        <CampoSelector valor={lugar && `${lugar.edificio}, ${salonTexto(lugar.salon)}`} placeholder="Ej: Auditorio Ad Portas" onPress={() => setVer('lugar')} />
        <Etiqueta>Fecha y hora</Etiqueta>
        <CampoSelector valor={fecha ? fechaRelativa(fecha) : null} placeholder="Ej: Viernes 25 de abril, 3:00 PM" onPress={() => setVer('fecha')} />
        <Etiqueta>Requerimientos especiales</Etiqueta>
        <Chips opciones={REQUERIMIENTOS} seleccion={reqs} onCambio={alternar} colorActivo={C.verde} />
        <Aviso texto={error} />
        <BotonPrimario
          texto="Solicitar soporte"
          g="verde"
          cargando={enviando}
          deshabilitado={!nombre.trim() || !lugar || !fecha}
          onPress={() => lugar && enviar({ tipo: 'SOPORTE_EVENTO', ubicacion: lugar, programadaPara: fecha, datos: { nombreEvento: nombre, requerimientos: reqs } })}
        />
      </Cuerpo>
      <SelectorLugar visible={ver === 'lugar'} inicial={lugar} onCerrar={() => setVer(null)} onElegir={(l) => (setLugar(l), setVer(null))} />
      <SelectorFecha visible={ver === 'fecha'} valor={fecha} onCerrar={() => setVer(null)} onElegir={(ms) => (setFecha(ms), setVer(null))} />
    </Pantalla>
  );
}
