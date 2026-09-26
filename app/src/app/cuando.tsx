import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Cuerpo, Encabezado, Pantalla, T, Tarjeta } from '@/ui/componentes';
import { Caja48 } from '@/ui/iconos';
import { C } from '@/ui/tema';

/** Pantalla "3b - ¿Cuándo lo necesitas?" (préstamo). */
export default function Cuando() {
  return (
    <Pantalla>
      <Encabezado titulo="¿Cuándo lo necesitas?" onAtras={() => (router.canGoBack() ? router.back() : router.replace('/inicio'))} />
      <Cuerpo arriba={28} gap={16}>
        <Opcion
          destacada
          glifo="rayo"
          titulo="Lo necesito ahora"
          texto="Se asigna un técnico disponible de inmediato"
          onPress={() => router.push({ pathname: '/prestamo', params: { modo: 'ahora' } })}
        />
        <Opcion
          glifo="calendario"
          titulo="Agendar para después"
          texto="Elige fecha y hora para un evento o clase especial"
          onPress={() => router.push({ pathname: '/prestamo', params: { modo: 'agendado' } })}
        />
      </Cuerpo>
    </Pantalla>
  );
}

function Opcion({ glifo, titulo, texto, onPress, destacada = false }: { glifo: 'rayo' | 'calendario'; titulo: string; texto: string; onPress: () => void; destacada?: boolean }) {
  return (
    <Tarjeta
      onPress={onPress}
      opacidad={destacada ? 0.95 : 0.7}
      radio={20}
      borde={destacada ? C.naranja : C.blanco}
      bordeAncho={destacada ? 2 : 1}
      sombra="0px 8px 20px rgba(89,102,153,0.10)"
      style={est.opcion}
    >
      <Caja48 glifo={glifo} />
      <View style={{ flex: 1, gap: 3 }}>
        <T peso="negrita" tam={15.5}>
          {titulo}
        </T>
        <T tam={12.5} color={C.textoSuave}>
          {texto}
        </T>
      </View>
    </Tarjeta>
  );
}

const est = StyleSheet.create({
  opcion: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, minHeight: 92 },
});
