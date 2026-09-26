import { router } from 'expo-router';
import { Cuerpo, Encabezado, Pantalla, T, Tarjeta } from '@/ui/componentes';
import { C } from '@/ui/tema';

/** "Privacidad y datos" (fila del perfil): qué guarda el sistema y para qué. */
const PUNTOS = [
  ['Qué guardamos', 'Tu usuario, nombre, correo institucional y las solicitudes que creas (salón, equipo, hora y estado).'],
  ['Para qué', 'Para asignar un técnico, avisarte en tiempo real y medir la demanda por sede y edificio.'],
  ['Quién lo ve', 'Tú ves tus solicitudes. Los técnicos ven las de su sede. La coordinación ve el panel con cifras agregadas.'],
  ['El QR', 'El código del equipo solo identifica la placa; la ubicación la decide el servidor, no el QR.'],
];

export default function Privacidad() {
  return (
    <Pantalla>
      <Encabezado titulo="Privacidad y datos" onAtras={() => (router.canGoBack() ? router.back() : router.replace('/perfil'))} />
      <Cuerpo gap={12}>
        {PUNTOS.map(([titulo, texto]) => (
          <Tarjeta key={titulo} radio={18} sombra={null} style={{ padding: 18, gap: 6 }}>
            <T peso="negrita" tam={14}>
              {titulo}
            </T>
            <T tam={12.5} color={C.textoSuave} style={{ lineHeight: 18 }}>
              {texto}
            </T>
          </Tarjeta>
        ))}
      </Cuerpo>
    </Pantalla>
  );
}
