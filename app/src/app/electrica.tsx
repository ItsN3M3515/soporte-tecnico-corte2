import { useState } from 'react';
import { router } from 'expo-router';
import { useEnviarSolicitud } from '@/lib/enviar';
import { salonTexto } from '@/lib/formato';
import { Aviso, BotonPrimario, Campo, CampoSelector, Chips, Cuerpo, Encabezado, Etiqueta, Pantalla } from '@/ui/componentes';
import { SelectorLugar, type Lugar } from '@/ui/Selectores';
import { C } from '@/ui/tema';

/** Pantalla "14 - Reportar falla eléctrica". Se atiende de inmediato (no se agenda). */
type Falla = 'TOMA_DANADA' | 'CABLE_EXPUESTO' | 'SIN_ENERGIA';
const FALLAS: { valor: Falla; texto: string }[] = [
  { valor: 'TOMA_DANADA', texto: 'Toma dañada' },
  { valor: 'CABLE_EXPUESTO', texto: 'Cable expuesto' },
  { valor: 'SIN_ENERGIA', texto: 'Sin energía' },
];

export default function Electrica() {
  const [lugar, setLugar] = useState<Lugar | null>(null);
  const [falla, setFalla] = useState<Falla | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [verLugar, setVerLugar] = useState(false);
  const { enviar, enviando, error } = useEnviarSolicitud();

  return (
    <Pantalla>
      <Encabezado titulo="Falla eléctrica" resplandor={C.rojo} onAtras={() => (router.canGoBack() ? router.back() : router.replace('/servicios'))} />
      <Cuerpo arriba={28} gap={18}>
        <Etiqueta>Edificio y salón</Etiqueta>
        <CampoSelector valor={lugar && `${lugar.edificio}, ${salonTexto(lugar.salon)}`} placeholder="Ej: Edificio K, Salón 204" onPress={() => setVerLugar(true)} />
        <Etiqueta>Tipo de falla</Etiqueta>
        <Chips opciones={FALLAS} seleccion={falla ? [falla] : []} onCambio={setFalla} colorActivo={C.rojo} />
        <Etiqueta>Descripción</Etiqueta>
        <Campo value={descripcion} onChangeText={setDescripcion} placeholder="Describe qué observaste..." maxLength={200} />
        <Aviso texto={error} />
        <BotonPrimario
          texto="Reportar falla"
          g="rojo"
          cargando={enviando}
          deshabilitado={!lugar || !falla}
          onPress={() => lugar && enviar({ tipo: 'FALLA_ELECTRICA', ubicacion: lugar, datos: { tipoFalla: falla, descripcion } })}
        />
      </Cuerpo>
      <SelectorLugar visible={verLugar} inicial={lugar} onCerrar={() => setVerLugar(false)} onElegir={(l) => (setLugar(l), setVerLugar(false))} />
    </Pantalla>
  );
}
