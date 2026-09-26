import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CosturaFade, Resplandor, T, useArriba } from './componentes';
import { Icono } from './iconos';
import { C, G } from './tema';

/**
 * Header de "1 - Inicio": logo, campana, saludo, nombre y (opcional) barra de búsqueda.
 * También lo usa la pantalla de inicio de sesión, para que la app se vea igual desde el principio.
 */
export function EncabezadoInicio({
  saludo,
  nombre,
  onCampana,
  hayNuevas = false,
  children,
}: {
  saludo: string;
  nombre: string;
  onCampana?: () => void;
  hayNuevas?: boolean;
  children?: ReactNode;
}) {
  const arriba = useArriba();
  return (
    <>
      <View style={[est.header, { paddingTop: arriba - 17 }]}>
        <LinearGradient
          colors={G.encabezado.colores as unknown as [string, string, ...string[]]}
          locations={G.encabezado.paradas as unknown as [number, number, ...number[]]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Resplandor diametro={260} color={C.naranja} opacidad={0.35} desenfoque={60} x={260} y={-157} />
        <Resplandor diametro={180} color="#35C4C9" opacidad={0.25} desenfoque={50} x={-80} y={103} />
        <View style={est.filaSuperior}>
          <View style={est.logo}>
            <View style={est.marca}>
              <T peso="negrita" tam={14}>
                US
              </T>
            </View>
            <T peso="extra" tam={21} color={C.blanco}>
              AsisTec
            </T>
          </View>
          {onCampana && (
            <Pressable onPress={onCampana} accessibilityRole="button" accessibilityLabel="Notificaciones" style={est.campana}>
              <Icono nombre="campana" />
              {hayNuevas && <View style={est.punto} />}
            </Pressable>
          )}
        </View>
        <View style={{ gap: 4 }}>
          <T peso="medio" tam={14} color={C.crema}>
            {saludo}
          </T>
          <T peso="extra" tam={27} color={C.blanco} lineas={1}>
            {nombre}
          </T>
        </View>
        {children}
      </View>
      <CosturaFade arriba={166} />
    </>
  );
}

const est = StyleSheet.create({
  header: { overflow: 'hidden', paddingHorizontal: 24, paddingBottom: 32, gap: 20, minHeight: 259 },
  filaSuperior: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44 },
  logo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  marca: { width: 38, height: 44, borderRadius: 10, backgroundColor: C.blanco, alignItems: 'center', justifyContent: 'center' },
  campana: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  punto: { position: 'absolute', top: 9, right: 10, width: 9, height: 9, borderRadius: 5, backgroundColor: C.naranja, borderWidth: 1.5, borderColor: '#2E3192' },
});
