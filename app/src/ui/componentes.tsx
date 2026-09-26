import { type ReactNode, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, RadialGradient, Stop, Text as SvgText } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F, G, SOMBRA, type NombreG } from './tema';
import { Icono, useIdSvg } from './iconos';

/**
 * Componentes del prototipo AsisTec (Figma). Cada uno corresponde a un componente
 * o capa con nombre en el archivo de Figma (Header, BackButton, SeamFade, Field,
 * Toggle, Stepper, Chip, SubmitBtn, BottomNav...). Medidas y colores en ./tema.ts.
 */

// ---------- Texto ----------
type Peso = keyof typeof F;
export function T({
  children,
  peso = 'regular',
  tam = 14,
  color = C.texto,
  style,
  lineas,
  alinear,
}: {
  children: ReactNode;
  peso?: Peso;
  tam?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
  lineas?: number;
  alinear?: 'left' | 'center' | 'right';
}) {
  return (
    <Text numberOfLines={lineas} style={[{ fontFamily: F[peso], fontSize: tam, color, textAlign: alinear }, style]}>
      {children}
    </Text>
  );
}

// ---------- Degradado ----------
/** Degradado de Figma a 135° (esquina superior izquierda → inferior derecha). */
export function Degradado({
  g,
  style,
  children,
  angulo = 135,
}: {
  g: NombreG;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  angulo?: 135 | 90 | 171;
}) {
  const puntos = {
    135: { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
    90: { start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 } },
    171: { start: { x: 0.35, y: 0 }, end: { x: 0.65, y: 1 } },
  }[angulo];
  const colores = G[g].colores as unknown as [string, string, ...string[]];
  const paradas = angulo === 135 ? ([0.07, 0.79] as [number, number]) : undefined;
  return (
    <LinearGradient colors={colores} locations={paradas} {...puntos} style={style}>
      {children}
    </LinearGradient>
  );
}

// ---------- Resplandor (Ellipse con desenfoque de capa en Figma) ----------
export function Resplandor({ diametro, color, opacidad, desenfoque, x, y }: { diametro: number; color: string; opacidad: number; desenfoque: number; x: number; y: number }) {
  const lado = diametro + desenfoque * 2;
  const id = useIdSvg('r');
  const interior = Math.max(0, (diametro / 2 - desenfoque) / (lado / 2));
  return (
    <Svg width={lado} height={lado} style={{ position: 'absolute', left: x - desenfoque, top: y - desenfoque }} pointerEvents="none">
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset={0} stopColor={color} stopOpacity={opacidad} />
          <Stop offset={interior} stopColor={color} stopOpacity={opacidad * 0.9} />
          <Stop offset={(diametro / 2) / (lado / 2)} stopColor={color} stopOpacity={opacidad * 0.45} />
          <Stop offset={1} stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={lado / 2} cy={lado / 2} r={lado / 2} fill={`url(#${id})`} />
    </Svg>
  );
}

// ---------- Texto con degradado (cifras del panel del coordinador) ----------
export function TextoDegradado({ texto, g, tam }: { texto: string; g: NombreG; tam: number }) {
  const [c1, c2] = G[g].colores;
  const ancho = Math.ceil(texto.length * tam * 0.66) + 2;
  const id = useIdSvg('td');
  return (
    <Svg width={ancho} height={tam * 1.25} accessibilityLabel={texto}>
      <Defs>
        <SvgLinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset={0.07} stopColor={c1} />
          <Stop offset={0.79} stopColor={c2} />
        </SvgLinearGradient>
      </Defs>
      <SvgText x={0} y={tam} fontFamily={F.extra} fontWeight="800" fontSize={tam} fill={`url(#${id})`}>
        {texto}
      </SvgText>
    </Svg>
  );
}

// ---------- Pantalla ----------
/** Fondo de todas las pantallas: degradado #F4F5FC → #EAEDFB. */
export function Pantalla({ children, fondo, pie }: { children: ReactNode; fondo?: string; pie?: ReactNode }) {
  return (
    <View style={{ flex: 1, backgroundColor: fondo ?? C.fondoArriba }}>
      {!fondo && <Degradado g="fondo" angulo={171} style={StyleSheet.absoluteFill} />}
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={est.columna}>{children}</View>
      </ScrollView>
      {pie}
    </View>
  );
}

/** Espacio superior como en Figma (58 px incluyen la barra de estado del teléfono). */
export function useArriba() {
  const insets = useSafeAreaInsets();
  return Platform.OS === 'web' ? 58 : insets.top + 14;
}

// ---------- Header + BackButton + SeamFade ----------
export function Encabezado({
  titulo,
  onAtras,
  resplandor = C.naranja,
  extraAbajo = 0,
  costura = true,
  oscuro = false,
  etiquetaAtras = 'Volver',
}: {
  titulo: string;
  onAtras?: () => void;
  /** Texto accesible del botón de la flecha; en técnico y coordinador la flecha cierra sesión. */
  etiquetaAtras?: string;
  resplandor?: string | null;
  extraAbajo?: number;
  costura?: boolean;
  oscuro?: boolean;
}) {
  const arriba = useArriba();
  const h = arriba + 66 + extraAbajo;
  return (
    <>
      <View style={{ height: h, overflow: 'hidden' }}>
        <LinearGradient
          colors={G.encabezado.colores as unknown as [string, string, ...string[]]}
          locations={(oscuro ? [0.05, 0.5, 0.88, 1] : G.encabezado.paradas) as unknown as [number, number, ...number[]]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {resplandor && <Resplandor diametro={200} color={resplandor} opacidad={0.3} desenfoque={50} x={260} y={-110} />}
        <View style={[est.filaEncabezado, { paddingTop: arriba }]}>
          {onAtras && (
            <Pressable onPress={onAtras} accessibilityRole="button" accessibilityLabel={etiquetaAtras} hitSlop={8}>
              <Icono nombre="atras" />
            </Pressable>
          )}
          <T peso="negrita" tam={18} color={C.blanco} lineas={1} style={{ flexShrink: 1 }}>
            {titulo}
          </T>
        </View>
      </View>
      {costura && <CosturaFade arriba={h - 90} />}
    </>
  );
}

/** SeamFade: funde el final del encabezado con el fondo de la pantalla. */
export function CosturaFade({ arriba }: { arriba: number }) {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={['rgba(244,245,252,0)', 'rgba(244,245,252,0.85)', '#F4F5FC']}
      locations={[0, 0.55, 1]}
      style={{ position: 'absolute', left: 0, right: 0, top: arriba, height: 150 }}
    />
  );
}

/** Body: columna con padding lateral de 20 px. */
export function Cuerpo({ children, gap = 20, arriba = 26, abajo = 30, style }: { children: ReactNode; gap?: number; arriba?: number; abajo?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ paddingHorizontal: 20, paddingTop: arriba, paddingBottom: abajo, gap }, style]}>{children}</View>;
}

// ---------- Tarjetas ----------
export function Tarjeta({
  children,
  style,
  onPress,
  opacidad = 0.8,
  radio = 18,
  sombra = SOMBRA.tarjetaSuave,
  borde = C.blanco,
  bordeAncho = 1,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  opacidad?: number;
  radio?: number;
  sombra?: string | null;
  borde?: string;
  bordeAncho?: number;
}) {
  const base: ViewStyle = {
    backgroundColor: `rgba(255,255,255,${opacidad})`,
    borderColor: borde,
    borderWidth: bordeAncho,
    borderRadius: radio,
    ...(sombra ? { boxShadow: sombra } : null),
  };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [base, style, pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }]}>
      {children}
    </Pressable>
  );
}

/** Fila de lista (pantallas 8 y 9): icono de 44 px, título, subtítulo y algo a la derecha. */
export function Fila({
  icono,
  titulo,
  subtitulo,
  derecha,
  onPress,
  tamIcono = 44,
}: {
  icono: ReactNode;
  titulo: string;
  subtitulo?: string;
  derecha?: ReactNode;
  onPress?: () => void;
  tamIcono?: 44 | 40;
}) {
  const grande = tamIcono === 44;
  return (
    <Tarjeta onPress={onPress} sombra={grande ? SOMBRA.tarjetaSuave : null} style={[est.fila, { minHeight: grande ? 74 : 70 }]}>
      {icono}
      <View style={{ flex: 1, gap: 2 }}>
        <T peso="negrita" tam={grande ? 14 : 13.5} lineas={1}>
          {titulo}
        </T>
        {subtitulo ? (
          <T tam={grande ? 12 : 11.5} color={C.textoSuave} lineas={1}>
            {subtitulo}
          </T>
        ) : null}
      </View>
      {derecha}
    </Tarjeta>
  );
}

// ---------- Insignia (badge de estado) ----------
export function Insignia({ texto, color, g, tam = 9 }: { texto: string; color?: string; g?: NombreG; tam?: number }) {
  const contenido = (
    <T peso="negrita" tam={tam} color={C.blanco} style={{ letterSpacing: 0.2 }}>
      {texto}
    </T>
  );
  const caja: ViewStyle = { borderRadius: tam > 9 ? 10 : 8, paddingHorizontal: tam > 9 ? 9 : 8, paddingVertical: 4 };
  if (g) return <Degradado g={g} angulo={135} style={caja}>{contenido}</Degradado>;
  return <View style={[caja, { backgroundColor: color ?? C.naranja }]}>{contenido}</View>;
}

// ---------- Botones ----------
export function BotonPrimario({
  texto,
  onPress,
  g = 'primario',
  cargando = false,
  deshabilitado = false,
  alto = 55,
  radio = 18,
  tam = 15.5,
  sombra = true,
  style,
}: {
  texto: string;
  onPress: () => void;
  g?: NombreG;
  cargando?: boolean;
  deshabilitado?: boolean;
  alto?: number;
  radio?: number;
  tam?: number;
  sombra?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const inactivo = deshabilitado || cargando;
  const colorSombra = { primario: SOMBRA.boton, naranja: '0px 8px 18px rgba(240,172,78,0.35)', verde: '0px 10px 24px rgba(42,193,126,0.30)', rojo: '0px 10px 24px rgba(232,83,74,0.30)', lavanda: '0px 10px 24px rgba(108,116,201,0.30)' }[g as string] ?? SOMBRA.boton;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactivo}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactivo }}
      style={({ pressed }) => [{ borderRadius: radio, opacity: deshabilitado ? 0.5 : pressed ? 0.9 : 1 }, sombra && !deshabilitado ? { boxShadow: colorSombra } : null, style]}
    >
      <Degradado g={g} angulo={g === 'primario' ? 171 : 135} style={{ height: alto, borderRadius: radio, alignItems: 'center', justifyContent: 'center' }}>
        {cargando ? <ActivityIndicator color={C.blanco} /> : <T peso="negrita" tam={tam} color={C.blanco}>{texto}</T>}
      </Degradado>
    </Pressable>
  );
}

export function BotonSuave({ texto, onPress, style }: { texto: string; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [est.botonSuave, pressed && { opacity: 0.8 }, style]}>
      <T peso="negrita" tam={12.5}>
        {texto}
      </T>
    </Pressable>
  );
}

// ---------- Formularios (Field, Toggle, Stepper, Chips) ----------
export function Etiqueta({ children }: { children: ReactNode }) {
  return (
    <T peso="negrita" tam={13.5}>
      {children}
    </T>
  );
}

const cajaCampo: ViewStyle = {
  backgroundColor: 'rgba(255,255,255,0.85)',
  borderColor: C.borde,
  borderWidth: 1.2,
  borderRadius: 16,
};

export function Campo(props: TextInputProps & { multilinea?: boolean }) {
  const [foco, setFoco] = useState(false);
  const { multilinea, style, ...resto } = props;
  return (
    <TextInput
      placeholderTextColor={C.textoSuave}
      multiline={multilinea}
      onFocus={() => setFoco(true)}
      onBlur={() => setFoco(false)}
      style={[
        cajaCampo,
        { paddingHorizontal: 18, paddingVertical: 15, fontFamily: F.regular, fontSize: 14.5, color: C.texto, minHeight: 50 },
        multilinea && { minHeight: 80, textAlignVertical: 'top' },
        foco && { borderColor: C.naranja },
        Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null,
        style,
      ]}
      {...resto}
    />
  );
}

/** Campo que abre un selector (edificio y salón, fecha): se ve igual que un Field. */
export function CampoSelector({ valor, placeholder, onPress, icono, derecha }: { valor?: string | null; placeholder: string; onPress: () => void; icono?: ReactNode; derecha?: ReactNode }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [cajaCampo, est.selector, icono ? { paddingVertical: 16 } : null, pressed && { opacity: 0.85 }]}>
      {icono}
      <T peso={valor ? (icono ? 'negrita' : 'medio') : 'regular'} tam={14.5} color={valor ? C.texto : C.textoSuave} style={{ flex: 1 }} lineas={1}>
        {valor || placeholder}
      </T>
      {derecha}
    </Pressable>
  );
}

export function Interruptor({ texto, valor, onCambio }: { texto: string; valor: boolean; onCambio: (v: boolean) => void }) {
  return (
    <Pressable onPress={() => onCambio(!valor)} accessibilityRole="switch" accessibilityState={{ checked: valor }} style={[cajaCampo, est.toggle]}>
      <T peso="medio" tam={14} style={{ flex: 1 }}>
        {texto}
      </T>
      {valor ? (
        <Degradado g="naranja" angulo={90} style={est.pista}>
          <View style={[est.perilla, { left: 22 }]} />
        </Degradado>
      ) : (
        <View style={[est.pista, { backgroundColor: C.apagado }]}>
          <View style={[est.perilla, { left: 3 }]} />
        </View>
      )}
    </Pressable>
  );
}

export function Contador({ texto, valor, onCambio, min = 1, max = 10 }: { texto: string; valor: number; onCambio: (v: number) => void; min?: number; max?: number }) {
  return (
    <View style={[cajaCampo, est.stepper]}>
      <T peso="medio" tam={14.5}>
        {texto}
      </T>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Pressable onPress={() => onCambio(Math.max(min, valor - 1))} accessibilityLabel="Menos" style={[est.circulo30, { backgroundColor: C.botonSuave, opacity: valor <= min ? 0.5 : 1 }]}>
          <T peso="negrita" tam={16}>
            –
          </T>
        </Pressable>
        <T peso="extra" tam={16} style={{ minWidth: 11, textAlign: 'center' }}>
          {valor}
        </T>
        <Pressable onPress={() => onCambio(Math.min(max, valor + 1))} accessibilityLabel="Más" style={{ opacity: valor >= max ? 0.5 : 1 }}>
          <Degradado g="naranja" style={est.circulo30}>
            <T peso="negrita" tam={16} color={C.blanco}>
              +
            </T>
          </Degradado>
        </Pressable>
      </View>
    </View>
  );
}

/** Fila de chips. `colorActivo` es el del botón de la pantalla (lavanda, verde o rojo). */
export function Chips<V extends string>({
  opciones,
  seleccion,
  onCambio,
  colorActivo,
}: {
  opciones: { valor: V; texto: string }[];
  seleccion: V[];
  onCambio: (valor: V) => void;
  colorActivo: string;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {opciones.map((o) => {
        const activo = seleccion.includes(o.valor);
        return (
          <Pressable
            key={o.valor}
            onPress={() => onCambio(o.valor)}
            accessibilityRole="button"
            accessibilityState={{ selected: activo }}
            style={[est.chip, activo ? { backgroundColor: colorActivo, borderColor: colorActivo } : null]}
          >
            <T peso="negrita" tam={12.5} color={activo ? C.blanco : C.texto}>
              {o.texto}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------- Mensajes ----------
export function Aviso({ texto, tipo = 'error' }: { texto: string | null; tipo?: 'error' | 'info' }) {
  if (!texto) return null;
  const error = tipo === 'error';
  return (
    <View style={[est.aviso, { backgroundColor: error ? C.rojoFondo : C.botonSuave }]}>
      <T peso="medio" tam={12.5} color={error ? C.rojo : C.morado}>
        {texto}
      </T>
    </View>
  );
}

export function Cargando() {
  return (
    <View style={{ paddingVertical: 40, alignItems: 'center' }}>
      <ActivityIndicator color={C.morado} />
    </View>
  );
}

// ---------- Hoja inferior (CalendarOverlay / selectores) ----------
export function Hoja({ visible, onCerrar, titulo, children }: { visible: boolean; onCerrar: () => void; titulo: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCerrar}>
      <Pressable style={est.velo} onPress={onCerrar} accessibilityLabel="Cerrar" />
      <View style={[est.hoja, { paddingBottom: 30 + insets.bottom }]}>
        <View style={est.asa} />
        <T peso="extra" tam={17} alinear="center">
          {titulo}
        </T>
        <ScrollView style={{ maxHeight: 560 }} contentContainerStyle={{ gap: 16 }} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

const est = StyleSheet.create({
  columna: { width: '100%', maxWidth: 480, alignSelf: 'center', flexGrow: 1 },
  filaEncabezado: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15, paddingHorizontal: 16 },
  botonSuave: { backgroundColor: C.botonSuave, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  selector: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 15, minHeight: 50 },
  toggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 16, gap: 4 },
  pista: { width: 46, height: 27, borderRadius: 14 },
  perilla: { position: 'absolute', top: 3, width: 21, height: 21, borderRadius: 11, backgroundColor: C.blanco },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14 },
  circulo30: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  chip: { backgroundColor: 'rgba(255,255,255,0.85)', borderColor: C.borde, borderWidth: 1.2, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 16 },
  aviso: { borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16 },
  velo: { flex: 1, backgroundColor: 'rgba(13,22,56,0.45)' },
  hoja: {
    backgroundColor: C.fondoArriba,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 14,
    paddingHorizontal: 20,
    gap: 16,
    boxShadow: '0px -10px 30px rgba(13,20,51,0.30)',
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  asa: { width: 40, height: 5, borderRadius: 3, backgroundColor: C.apagado, alignSelf: 'center' },
});
