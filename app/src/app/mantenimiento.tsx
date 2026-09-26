import { useState } from 'react';
import { router } from 'expo-router';
import { useEnviarSolicitud } from '@/lib/enviar';
import { fechaRelativa, salonTexto } from '@/lib/formato';
import { Aviso, BotonPrimario, Campo, CampoSelector, Chips, Cuerpo, Encabezado, Etiqueta, Pantalla } from '@/ui/componentes';
import { SelectorFecha, SelectorLugar, type Lugar } from '@/ui/Selectores';
import { C } from '@/ui/tema';

/** Pantalla "12 - Agendar mantenimiento". */
type Revision = 'GENERAL' | 'AIRE_ACONDICIONADO' | 'MOBILIARIO';
const REVISIONES: { valor: Revision; texto: string }[] = [
  { valor: 'GENERAL', texto: 'General' },
  { valor: 'AIRE_ACONDICIONADO', texto: 'A/C' },
  { valor: 'MOBILIARIO', texto: 'Mobiliario' },
];

export default function Mantenimiento() {
  const [lugar, setLugar] = useState<Lugar | null>(null);
  const [revision, setRevision] = useState<Revision>('GENERAL');
  const [fecha, setFecha] = useState<number | null>(null);
  const [notas, setNotas] = useState('');
  const [ver, setVer] = useState<'lugar' | 'fecha' | null>(null);
  const { enviar, enviando, error } = useEnviarSolicitud();

  return (
    <Pantalla>
      <Encabezado titulo="Agendar mantenimiento" resplandor="#A8AEDC" onAtras={() => (router.canGoBack() ? router.back() : router.replace('/servicios'))} />
      <Cuerpo arriba={28} gap={18}>
        <Etiqueta>Edificio y salón</Etiqueta>
        <CampoSelector valor={lugar && `${lugar.edificio}, ${salonTexto(lugar.salon)}`} placeholder="Ej: Edificio Ad Portas, Salón 12" onPress={() => setVer('lugar')} />
        <Etiqueta>Tipo de revisión</Etiqueta>
        <Chips opciones={REVISIONES} seleccion={[revision]} onCambio={setRevision} colorActivo={C.lavanda} />
        <Etiqueta>Fecha preferida</Etiqueta>
        <CampoSelector valor={fecha ? fechaRelativa(fecha) : null} placeholder="Ej: Lunes 14 de abril" onPress={() => setVer('fecha')} />
        <Etiqueta>Notas adicionales</Etiqueta>
        <Campo value={notas} onChangeText={setNotas} placeholder="Describe brevemente qué necesita revisión..." maxLength={200} />
        <Aviso texto={error} />
        <BotonPrimario
          texto="Agendar revisión"
          g="lavanda"
          cargando={enviando}
          deshabilitado={!lugar || !fecha}
          onPress={() => lugar && enviar({ tipo: 'MANTENIMIENTO', ubicacion: lugar, programadaPara: fecha, datos: { tipoRevision: revision, notas } })}
        />
      </Cuerpo>
      <SelectorLugar visible={ver === 'lugar'} inicial={lugar} onCerrar={() => setVer(null)} onElegir={(l) => (setLugar(l), setVer(null))} />
      <SelectorFecha visible={ver === 'fecha'} valor={fecha} onCerrar={() => setVer(null)} onElegir={(ms) => (setFecha(ms), setVer(null))} />
    </Pantalla>
  );
}
