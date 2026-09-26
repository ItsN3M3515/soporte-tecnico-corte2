/**
 * En el celular (Expo Go) el QR se lee con expo-camera; estos componentes solo existen en la web
 * (ver EscanerWeb.web.tsx). Aquí quedan vacíos para que la app nativa compile igual.
 */
export type EstadoCamaraWeb = 'iniciando' | 'activa' | 'no-disponible';

export function EscanerWeb(_: { activo: boolean; onLeer: (texto: string) => void; onEstado: (e: EstadoCamaraWeb) => void }) {
  return null;
}

export function BotonSubirQR(_: { onLeer: (texto: string) => void; onError: (mensaje: string) => void }) {
  return null;
}
