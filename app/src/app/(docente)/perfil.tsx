import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSesion } from '@/lib/sesion';
import { Cuerpo, Degradado, Encabezado, Fila, Pantalla, T } from '@/ui/componentes';
import { Caja40, Icono } from '@/ui/iconos';
import { C } from '@/ui/tema';

/** Pantalla "10 - Perfil". */
export default function Perfil() {
  const { perfil, cerrar } = useSesion();

  const salir = () => {
    cerrar();
    router.replace('/');
  };

  return (
    <Pantalla>
      <Encabezado titulo="Mi perfil" onAtras={() => router.navigate('/inicio')} />
      <Cuerpo arriba={30} gap={24} abajo={120} style={{ alignItems: 'stretch' }}>
        <View style={{ alignItems: 'center', gap: 24 }}>
          <Degradado g="morado" style={est.avatar} />
          <View style={{ alignItems: 'center', gap: 24 }}>
            <T peso="extra" tam={21}>
              {perfil?.nombre}
            </T>
            <T tam={13} color={C.textoSuave}>
              {perfil?.correo ?? perfil?.usuario}{perfil?.rol === 'ESTUDIANTE' ? ' · Estudiante' : perfil?.rol === 'DOCENTE' ? ' · Docente' : ''}
            </T>
          </View>
        </View>
        <View style={{ gap: 12 }}>
          <Fila tamIcono={40} icono={<Caja40 glifo="check" degradado="verde" />} titulo="Mis solicitudes" subtitulo="Ver historial completo" derecha={<Icono nombre="chevron15" />} onPress={() => router.push('/mis-solicitudes')} />
          <Fila tamIcono={40} icono={<Caja40 glifo="escudo" degradado="morado" />} titulo="Privacidad y datos" subtitulo="Cómo usamos tu información" derecha={<Icono nombre="chevron15" />} onPress={() => router.push('/privacidad')} />
          <Fila tamIcono={40} icono={<Caja40 glifo="campana" degradado="naranja" />} titulo="Notificaciones" subtitulo="Preferencias de aviso" derecha={<Icono nombre="chevron15" />} onPress={() => router.push('/notificaciones')} />
        </View>
        <Pressable onPress={salir} accessibilityRole="button" style={({ pressed }) => [est.salir, pressed && { opacity: 0.8 }]}>
          <Icono nombre="salir" />
          <T peso="negrita" tam={14} color={C.rojo}>
            Cerrar sesión
          </T>
        </Pressable>
      </Cuerpo>
    </Pantalla>
  );
}

const est = StyleSheet.create({
  avatar: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', boxShadow: '0px 10px 24px rgba(46,49,146,0.30)' },
  salir: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.rojoFondo, borderRadius: 16, paddingVertical: 16 },
});
