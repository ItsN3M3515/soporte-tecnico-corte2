import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Cuerpo, Encabezado, Pantalla, T, Tarjeta } from '@/ui/componentes';
import { Mancha58 } from '@/ui/iconos';
import { C, SOMBRA } from '@/ui/tema';

/** Pantalla "2 - Elegir tipo de solicitud". */
export default function Nueva() {
  return (
    <Pantalla>
      <Encabezado titulo="Nueva solicitud" onAtras={() => (router.canGoBack() ? router.back() : router.replace('/inicio'))} />
      <Cuerpo arriba={30} gap={18}>
        <T peso="extra" tam={22}>
          ¿Qué tipo de solicitud necesitas?
        </T>
        <Opcion tipo="falla" titulo="Reportar falla de equipo" texto="Video beam, PC de salón o cable dañado. Escanea el QR del equipo y listo." onPress={() => router.push('/escanear')} />
        <Opcion tipo="prestamo" titulo="Solicitar préstamo de equipo" texto="Pide un computador, extensión u otro recurso para tu salón o evento." onPress={() => router.push('/cuando')} />
      </Cuerpo>
    </Pantalla>
  );
}

function Opcion({ tipo, titulo, texto, onPress }: { tipo: 'falla' | 'prestamo'; titulo: string; texto: string; onPress: () => void }) {
  return (
    <Tarjeta onPress={onPress} opacidad={0.8} radio={24} sombra="0px 10px 26px rgba(89,102,153,0.12)" style={est.opcion}>
      <View style={{ alignSelf: 'flex-start', marginLeft: tipo === 'falla' ? 7 : 0, marginTop: tipo === 'falla' ? 0 : 8 }}>
        <Mancha58 tipo={tipo} variante="tipo" />
      </View>
      <T peso="negrita" tam={17.5}>
        {titulo}
      </T>
      <T tam={13.5} color={C.textoSuave}>
        {texto}
      </T>
    </Tarjeta>
  );
}

const est = StyleSheet.create({
  opcion: { paddingVertical: 26, paddingHorizontal: 22, gap: 16, boxShadow: SOMBRA.tarjeta },
});
