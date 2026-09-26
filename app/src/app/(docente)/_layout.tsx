import { Redirect } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSesion } from '@/lib/sesion';
import { IconoNavegacion, type IconoNav } from '@/ui/iconos';
import { T } from '@/ui/componentes';
import { C, SOMBRA } from '@/ui/tema';

/** Pestañas del docente o estudiante con la BottomNav del prototipo (Inicio · Servicios · Estado · Perfil). */
const PESTANAS: { nombre: string; icono: IconoNav; texto: string }[] = [
  { nombre: 'inicio', icono: 'inicio', texto: 'Inicio' },
  { nombre: 'servicios', icono: 'servicios', texto: 'Servicios' },
  { nombre: 'estado', icono: 'estado', texto: 'Estado' },
  { nombre: 'perfil', icono: 'perfil', texto: 'Perfil' },
];

function NavInferior({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const actual = state.routes[state.index]?.name;
  return (
    <View pointerEvents="box-none" style={[est.contenedor, { bottom: Math.max(20, insets.bottom + 6) }]}>
      <View style={est.barra}>
        {PESTANAS.map((p) => {
          const activo = actual === p.nombre;
          return (
            <Pressable
              key={p.nombre}
              accessibilityRole="tab"
              accessibilityState={{ selected: activo }}
              accessibilityLabel={p.texto}
              onPress={() => navigation.navigate(p.nombre)}
              style={[est.item, activo && est.itemActivo]}
            >
              <IconoNavegacion nombre={p.icono} activo={activo} />
              <T peso="negrita" tam={10} color={activo ? C.naranja : C.inactivo}>
                {p.texto}
              </T>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function LayoutDocente() {
  const { token, perfil, rutaInicio } = useSesion();
  if (!token || !perfil) return <Redirect href="/" />;
  // Estas pestañas son de docentes y estudiantes; un técnico o el coordinador vuelve a su pantalla.
  if (perfil.rol === 'TECNICO' || perfil.rol === 'ADMIN') return <Redirect href={rutaInicio(perfil.rol)} />;
  return (
    <Tabs tabBar={(props) => <NavInferior {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.fondoArriba } }}>
      {PESTANAS.map((p) => (
        <Tabs.Screen key={p.nombre} name={p.nombre} options={{ title: p.texto }} />
      ))}
    </Tabs>
  );
}

const est = StyleSheet.create({
  contenedor: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  barra: {
    width: '100%',
    maxWidth: 448,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(13,22,56,0.95)',
    borderRadius: 26,
    paddingVertical: 16,
    paddingHorizontal: 18,
    boxShadow: SOMBRA.nav,
  },
  item: { alignItems: 'center', gap: 5, borderRadius: 16, paddingVertical: 8, paddingHorizontal: 14 },
  itemActivo: { backgroundColor: 'rgba(240,172,78,0.18)' },
});
