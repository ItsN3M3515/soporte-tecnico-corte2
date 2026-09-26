import { useState } from 'react';
import { Redirect, router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSesion } from '@/lib/sesion';
import { Aviso, BotonPrimario, Campo, Cuerpo, Etiqueta, Hoja, Pantalla, T, Tarjeta } from '@/ui/componentes';
import { EncabezadoInicio } from '@/ui/EncabezadoInicio';
import { C } from '@/ui/tema';

/**
 * Inicio de sesión. No está en el prototipo (Figma empieza en "Inicio" con la sesión abierta),
 * así que usa el mismo encabezado y los mismos campos para que no se note el cambio.
 * Cada rol entra a su pantalla: docente o estudiante → Inicio, técnico → "Mis solicitudes de hoy",
 * coordinador → "Panel del coordinador".
 */
const CUENTAS = [
  { rol: 'Docente', usuario: 'docente', clave: 'docente123' },
  { rol: 'Estudiante', usuario: 'estudiante', clave: 'estudiante123' },
  { rol: 'Técnico', usuario: 'laura', clave: 'tecnico123' },
  { rol: 'Coordinador', usuario: 'admin', clave: 'admin123' },
];

export default function IniciarSesion() {
  const { token, perfil, iniciar, apiUrl, setApiUrl, rutaInicio } = useSesion();
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [verServidor, setVerServidor] = useState(false);
  const [servidor, setServidor] = useState(apiUrl);

  if (token && perfil) return <Redirect href={rutaInicio(perfil.rol)} />;

  const entrar = async (u = usuario, c = clave) => {
    setCargando(true);
    setError(null);
    try {
      const p = await iniciar(u.trim(), c);
      router.replace(rutaInicio(p.rol));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <Pantalla>
      <EncabezadoInicio saludo="¡Bienvenido! 👋" nombre="Inicia sesión" />
      <Cuerpo arriba={22} gap={18}>
        <T peso="extra" tam={21}>
          Soporte técnico en aulas
        </T>
        <View style={{ gap: 12 }}>
          <Etiqueta>Usuario</Etiqueta>
          <Campo value={usuario} onChangeText={setUsuario} placeholder="Ej: docente o estudiante" autoCapitalize="none" autoCorrect={false} />
          <Etiqueta>Clave</Etiqueta>
          <Campo value={clave} onChangeText={setClave} placeholder="Tu clave" secureTextEntry onSubmitEditing={() => entrar()} />
        </View>
        <Aviso texto={error} />
        <BotonPrimario texto="Entrar" onPress={() => entrar()} cargando={cargando} deshabilitado={!usuario || !clave} />

        <Tarjeta opacidad={0.75} radio={20} style={{ padding: 16, gap: 12 }}>
          <T peso="negrita" tam={13.5}>
            Cuentas de prueba
          </T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CUENTAS.map((c) => (
              <Pressable
                key={c.usuario}
                onPress={() => entrar(c.usuario, c.clave)}
                accessibilityRole="button"
                style={({ pressed }) => ({ flexBasis: '47%', flexGrow: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 14, backgroundColor: pressed ? '#E4E7F5' : C.botonSuave })}
              >
                <T peso="negrita" tam={12.5}>
                  {c.rol}
                </T>
                <T tam={10.5} color={C.textoSuave}>
                  {c.usuario}
                </T>
              </Pressable>
            ))}
          </View>
        </Tarjeta>

        <Pressable onPress={() => setVerServidor(true)} accessibilityRole="button" style={{ alignSelf: 'center', paddingVertical: 6 }}>
          <T peso="negrita" tam={12.5} color={C.textoSuave}>
            Servidor: {apiUrl}
          </T>
        </Pressable>
      </Cuerpo>

      <Hoja visible={verServidor} onCerrar={() => setVerServidor(false)} titulo="Dirección del servidor">
        <T tam={13} color={C.textoSuave}>
          En el celular use la IP del computador donde corre el backend, por ejemplo http://192.168.1.20:3000
        </T>
        <Campo value={servidor} onChangeText={setServidor} autoCapitalize="none" autoCorrect={false} keyboardType="url" />
        <BotonPrimario
          texto="Guardar"
          g="naranja"
          alto={52}
          radio={16}
          tam={15}
          onPress={() => {
            setApiUrl(servidor.trim());
            setVerServidor(false);
          }}
        />
      </Hoja>
    </Pantalla>
  );
}
