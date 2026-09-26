import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { BotonPrimario, Degradado, Pantalla, Resplandor, T, Tarjeta } from '@/ui/componentes';
import { Icono } from '@/ui/iconos';
import { C } from '@/ui/tema';

/** Pantalla "7 - Confirmación de envío". */
export default function Confirmacion() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Pantalla>
      <View style={est.cuerpo}>
        <View style={est.brillo}>
          <Resplandor diametro={160} color={C.verde} opacidad={0.25} desenfoque={40} x={0} y={0} />
          <Degradado g="verde" style={est.circulo}>
            <Icono nombre="checkGrande" />
          </Degradado>
        </View>
        <T peso="extra" tam={26} alinear="center">
          ¡Solicitud enviada!
        </T>
        <T tam={14.5} color={C.textoSuave} alinear="center" style={{ maxWidth: 300, lineHeight: 18 }}>
          Te avisaremos apenas un técnico sea asignado. Puedes seguir el estado en tiempo real.
        </T>
        <Tarjeta opacidad={0.85} radio={14} sombra={null} style={{ paddingVertical: 14, paddingHorizontal: 20 }}>
          <T peso="negrita" tam={13.5}>
            N° de solicitud: #{id}
          </T>
        </Tarjeta>
        <BotonPrimario texto="Ver seguimiento" onPress={() => router.replace(`/seguimiento/${id}`)} style={{ alignSelf: 'stretch' }} />
        <Pressable onPress={() => router.replace('/inicio')} accessibilityRole="button" hitSlop={10}>
          <T peso="negrita" tam={13.5} color={C.textoSuave}>
            Volver al inicio
          </T>
        </Pressable>
      </View>
    </Pantalla>
  );
}

const est = StyleSheet.create({
  cuerpo: { flex: 1, alignItems: 'center', paddingTop: 120, paddingHorizontal: 30, paddingBottom: 40, gap: 28 },
  brillo: { width: 160, height: 160, alignItems: 'center', justifyContent: 'center' },
  circulo: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', boxShadow: '0px 12px 30px rgba(42,193,126,0.35)' },
});
