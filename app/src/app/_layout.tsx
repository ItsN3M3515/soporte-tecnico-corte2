import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import { ProveedorSesion } from '@/lib/sesion';
import { ProveedorTiempoReal } from '@/lib/tiempoReal';
import { C } from '@/ui/tema';

/** Raíz de la app: tipografía Inter (la del prototipo), sesión y conexión en tiempo real. */
export default function Layout() {
  const [fuentesListas] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold });
  if (!fuentesListas) return <View style={{ flex: 1, backgroundColor: C.fondoArriba }} />;
  return (
    <SafeAreaProvider>
      <ProveedorSesion>
        <ProveedorTiempoReal>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.fondoArriba } }} />
        </ProveedorTiempoReal>
      </ProveedorSesion>
    </SafeAreaProvider>
  );
}
