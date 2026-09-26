/** Tokens de diseño tomados del prototipo AsisTec (Figma). */
export const C = {
  fondoArriba: '#F4F5FC',
  fondoAbajo: '#EAEDFB',
  texto: '#0D1638',
  textoSuave: '#848FB3',
  textoTenue: '#B7BEDA',
  inactivo: '#A6ADC7',
  naranja: '#F0AC4E',
  crema: '#FFD98A',
  morado: '#2E3192',
  violeta: '#5B3B9E',
  verde: '#2AC17E',
  verdeTexto: '#187A4C',
  verdeFondo: '#E3F9EE',
  rojo: '#E8534A',
  rojoFondo: '#FBE4E1',
  rojoBorde: '#FBDAD6',
  lavanda: '#6C74C9',
  borde: '#E4E7F5',
  botonSuave: '#EEF0FC',
  apagado: '#D8DCE8',
  escaner: '#14162B',
  blanco: '#FFFFFF',
};

/** Degradados (colores y paradas). */
export const G = {
  encabezado: { colores: ['#0D1638', '#2E3192', '#5B3B9E', '#F4F5FC'], paradas: [0.0476, 0.4476, 0.7333, 1] },
  fondo: { colores: ['#F4F5FC', '#EAEDFB'] },
  primario: { colores: ['#0D1638', '#2E3192'] },
  naranja: { colores: ['#F0AC4E', '#FFD98A'] },
  morado: { colores: ['#2E3192', '#5B3B9E'] },
  verde: { colores: ['#2AC17E', '#6FE0AA'] },
  rojo: { colores: ['#E8534A', '#F58C85'] },
  lavanda: { colores: ['#6C74C9', '#A8AEDC'] },
} as const;
export type NombreG = keyof typeof G;

/** Familia Inter por peso (se cargan en _layout con @expo-google-fonts/inter). */
export const F = {
  regular: 'Inter_400Regular',
  medio: 'Inter_500Medium',
  semi: 'Inter_600SemiBold',
  negrita: 'Inter_700Bold',
  extra: 'Inter_800ExtraBold',
};

export const SOMBRA = {
  tarjeta: '0px 8px 22px rgba(89, 102, 153, 0.10)',
  tarjetaSuave: '0px 8px 14px rgba(89, 102, 153, 0.10)',
  estado: '0px 12px 30px rgba(89, 102, 153, 0.12)',
  boton: '0px 10px 24px rgba(46, 49, 146, 0.35)',
  naranja: '0px 8px 20px rgba(240, 172, 78, 0.15)',
  nav: '0px 10px 30px rgba(13, 20, 51, 0.30)',
};
