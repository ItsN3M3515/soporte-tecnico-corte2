import { memo, useId } from 'react';
import { SvgXml } from 'react-native-svg';

/**
 * Iconos exportados del prototipo AsisTec (Figma, exportAsync SVG_STRING).
 * Se guardan como texto SVG y se pintan con SvgXml, sin redibujarlos.
 *  - Cada instancia usa ids propios para sus gradientes/clips (useId): en la web todos los
 *    <svg> comparten el mismo espacio de ids, y si el primero con ese id está en una pantalla
 *    oculta, el degradado de las demás no se pinta.
 *  - Las "cajas" (cuadros con degradado + glifo blanco) se arman con el glifo exportado
 *    y el degradado de la paleta del prototipo.
 */

// ---------- Paleta de degradados del prototipo ----------
export const DEGRADADOS = {
  naranja: ['#F0AC4E', '#FFD98A'],
  morado: ['#2E3192', '#5B3B9E'],
  verde: ['#2AC17E', '#6FE0AA'],
  verdeOscuro: ['#29AD6B', '#4AD18C'],
  rojo: ['#E8534A', '#F58C85'],
  lavanda: ['#A8AEDC', '#D6D9F5'],
} as const;
export type NombreDegradado = keyof typeof DEGRADADOS;

const svg = (w: number, h: number, cuerpo: string) =>
  `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" xmlns="http://www.w3.org/2000/svg">${cuerpo}</svg>`;

/** Degradado a 135° como en Figma (linear-gradient(135deg, c1 7%, c2 79%)). */
const defDegradado = (id: string, [c1, c2]: readonly string[]) =>
  `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0.07" stop-color="${c1}"/><stop offset="0.79" stop-color="${c2}"/></linearGradient></defs>`;

// ---------- Glifos (trazos blancos) en el sistema de coordenadas de cada caja ----------
const GLIFOS_44 = {
  alerta: '<path d="M22 15.2709L29.5208 28.3334H14.4792L22 15.2709Z" stroke="white" stroke-width="1.425" stroke-linejoin="round"/><path d="M22 20.4166V23.9791" stroke="white" stroke-width="1.50417" stroke-linecap="round"/><path d="M22 27.1062C22.5028 27.1062 22.9104 26.6986 22.9104 26.1958C22.9104 25.693 22.5028 25.2854 22 25.2854C21.4972 25.2854 21.0896 25.693 21.0896 26.1958C21.0896 26.6986 21.4972 27.1062 22 27.1062Z" fill="white"/>',
  portatil: '<path d="M26.3542 16.4584H17.6458C16.7714 16.4584 16.0625 17.1673 16.0625 18.0417V22.7917C16.0625 23.6662 16.7714 24.375 17.6458 24.375H26.3542C27.2286 24.375 27.9375 23.6662 27.9375 22.7917V18.0417C27.9375 17.1673 27.2286 16.4584 26.3542 16.4584Z" stroke="white" stroke-width="1.34583"/><path d="M14.4792 27.5416H29.5208L28.3333 25.1666H15.6667L14.4792 27.5416Z" stroke="white" stroke-width="1.34583" stroke-linejoin="round"/>',
  calendario: '<path d="M25.5625 16.4584H18.4375C16.6886 16.4584 15.2708 17.8761 15.2708 19.625V25.9584C15.2708 27.7073 16.6886 29.125 18.4375 29.125H25.5625C27.3114 29.125 28.7292 27.7073 28.7292 25.9584V19.625C28.7292 17.8761 27.3114 16.4584 25.5625 16.4584Z" stroke="white" stroke-width="1.34583"/><path d="M15.2708 20.4166H28.7292" stroke="white" stroke-width="1.34583"/>',
  camara: '<path d="M27.5417 18.8334H16.4583C15.5839 18.8334 14.875 19.5423 14.875 20.4167V23.5834C14.875 24.4578 15.5839 25.1667 16.4583 25.1667H27.5417C28.4161 25.1667 29.125 24.4578 29.125 23.5834V20.4167C29.125 19.5423 28.4161 18.8334 27.5417 18.8334Z" stroke="white" stroke-width="1.26667"/><path d="M18.8333 23.5833C19.7078 23.5833 20.4167 22.8744 20.4167 22C20.4167 21.1255 19.7078 20.4166 18.8333 20.4166C17.9589 20.4166 17.25 21.1255 17.25 22C17.25 22.8744 17.9589 23.5833 18.8333 23.5833Z" stroke="white" stroke-width="1.26667"/><path d="M28.3333 20.4167L30.7083 18.8334V25.1667L28.3333 23.5834" stroke="white" stroke-width="1.26667" stroke-linejoin="round"/>',
  enchufe: '<path d="M19.625 14.0834V18.0417M24.375 14.0834V18.0417" stroke="white" stroke-width="1.34583" stroke-linecap="round"/><path d="M17.25 18.0416H26.75V22C26.75 24.6125 24.6125 26.75 22 26.75C19.3875 26.75 17.25 24.6125 17.25 22V18.0416Z" stroke="white" stroke-width="1.34583"/><path d="M22 26.75V29.9167" stroke="white" stroke-width="1.34583" stroke-linecap="round"/>',
};
export type Glifo = keyof typeof GLIFOS_44;

const GLIFOS_40 = {
  check: '<path d="M15.0417 20.7084L18.2292 23.8959L24.9584 16.4584" stroke="white" stroke-width="1.55833" stroke-linecap="round" stroke-linejoin="round"/>',
  escudo: '<path d="M20 12.9166L25.6666 15.0416V19.2916C25.6666 22.8333 23.1875 26.0208 20 27.0833C16.8125 26.0208 14.3333 22.8333 14.3333 19.2916V15.0416L20 12.9166Z" stroke="white" stroke-width="1.20417" stroke-linejoin="round"/>',
  campana: '<path d="M20 12.9166C18.7958 12.9166 17.875 13.8375 17.875 15.0416V15.2541C16.2458 15.8916 15.0417 17.45 15.0417 19.2916V22.8333L13.625 24.25V24.9583H26.375V24.25L24.9583 22.8333V19.2916C24.9583 17.45 23.7542 15.8916 22.125 15.2541V15.0416C22.125 13.8375 21.2042 12.9166 20 12.9166Z" stroke="white" stroke-width="1.20417" stroke-linejoin="round"/>',
};

const GLIFOS_38 = {
  check: '<path d="M14.3334 19.6667L17.3334 22.6667L23.6667 15.6667" stroke="white" stroke-width="1.46667" stroke-linecap="round" stroke-linejoin="round"/>',
  reloj: '<path d="M19 25C22.3137 25 25 22.3137 25 19C25 15.6863 22.3137 13 19 13C15.6863 13 13 15.6863 13 19C13 22.3137 15.6863 25 19 25Z" stroke="white" stroke-width="1.13333"/><path d="M19 15.6667V19.0001L21.3333 20.3334" stroke="white" stroke-width="1.13333" stroke-linecap="round" stroke-linejoin="round"/>',
};

const GLIFOS_48 = {
  alerta: '<path d="M24 16.2083L32.7083 31.3333H15.2917L24 16.2083Z" stroke="white" stroke-width="1.65" stroke-linejoin="round"/><path d="M24 22.1667V26.2917" stroke="white" stroke-width="1.74167" stroke-linecap="round"/><path d="M24 29.9125C24.5822 29.9125 25.0542 29.4405 25.0542 28.8583C25.0542 28.2761 24.5822 27.8041 24 27.8041C23.4178 27.8041 22.9458 28.2761 22.9458 28.8583C22.9458 29.4405 23.4178 29.9125 24 29.9125Z" fill="white"/>',
  rayo: '<path d="M24.9166 14.8334L16.6666 25.8334H23.0833L22.1666 33.1667L31.3333 21.25H24.9166V14.8334Z" fill="white"/>',
  calendario: '<path d="M28.125 17.5834H19.875C17.85 17.5834 16.2084 19.225 16.2084 21.25V28.5834C16.2084 30.6084 17.85 32.25 19.875 32.25H28.125C30.1501 32.25 31.7917 30.6084 31.7917 28.5834V21.25C31.7917 19.225 30.1501 17.5834 28.125 17.5834Z" fill="white"/>',
  portatil: `<g transform="scale(1.0909)">${GLIFOS_44.portatil}</g>`,
  calendarioLinea: `<g transform="scale(1.0909)">${GLIFOS_44.calendario}</g>`,
  camara: `<g transform="scale(1.0909)">${GLIFOS_44.camara}</g>`,
  enchufe: `<g transform="scale(1.0909)">${GLIFOS_44.enchufe}</g>`,
};

/** Id único y válido para SVG/CSS (useId devuelve algo como «:r1:»). */
export function useIdSvg(prefijo: string) {
  return `${prefijo}${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
}

function xmlCaja(id: string, tam: number, radio: number, degradado: NombreDegradado, glifo: string) {
  return svg(tam, tam, `${defDegradado(id, DEGRADADOS[degradado])}<rect width="${tam}" height="${tam}" rx="${radio}" fill="url(#${id})"/>${glifo}`);
}

/** Caja de 44 px (filas de "Servicios" y "Mis solicitudes"). */
export const Caja44 = memo(({ glifo, degradado }: { glifo: Glifo; degradado: NombreDegradado }) => {
  const id = useIdSvg('c44');
  return <SvgXml xml={xmlCaja(id, 44, 14, degradado, GLIFOS_44[glifo])} width={44} height={44} />;
});

/** Caja de 40 px (menú de "Mi perfil"). */
export const Caja40 = memo(({ glifo, degradado }: { glifo: keyof typeof GLIFOS_40; degradado: NombreDegradado }) => {
  const id = useIdSvg('c40');
  return <SvgXml xml={xmlCaja(id, 40, 12, degradado, GLIFOS_40[glifo])} width={40} height={40} />;
});

/** Caja de 38 px ("Notificaciones"). */
export const Caja38 = memo(({ glifo, degradado }: { glifo: keyof typeof GLIFOS_38; degradado: NombreDegradado }) => {
  const id = useIdSvg('c38');
  return <SvgXml xml={xmlCaja(id, 38, 12, degradado, GLIFOS_38[glifo])} width={38} height={38} />;
});

/** Caja de 48 px (tarjeta "Tu solicitud activa" y "¿Cuándo lo necesitas?"). */
export const Caja48 = memo(({ glifo, degradado = 'naranja' }: { glifo: keyof typeof GLIFOS_48; degradado?: NombreDegradado }) => {
  const id = useIdSvg('c48');
  return <SvgXml xml={xmlCaja(id, 48, 15, degradado, GLIFOS_48[glifo])} width={48} height={48} />;
});

// ---------- Manchas orgánicas (blobs) de las tarjetas de opción ----------
const MANCHAS = {
  // Inicio (58 px, exportadas con su rotación; el SVG es un poco más grande que el marco)
  fallaInicio: svg(64, 64, '<g clip-path="url(#mfi-c)"><path d="M34.6947 5.02037C45.739 5.17566 59.1397 11.6117 59.7698 24.7495C60.5045 36.8928 53.2831 48.1999 40.6171 53.9072C27.9511 59.6145 12.2478 55.953 6.43601 44.2816C0.624168 32.6102 6.27471 17.1159 17.0562 10.205C23.5459 5.8596 28.6231 5.38772 34.6947 5.02037Z" fill="url(#mfi-g)"/><path d="M30.8844 24.7712L39.5928 39.8962H22.1761L30.8844 24.7712Z" stroke="white" stroke-width="1.65" stroke-linejoin="round"/><path d="M30.8844 30.7296V34.8546" stroke="white" stroke-width="1.74167" stroke-linecap="round"/><path d="M30.8844 38.4754C31.4666 38.4754 31.9386 38.0034 31.9386 37.4212C31.9386 36.839 31.4666 36.3671 30.8844 36.3671C30.3022 36.3671 29.8303 36.839 29.8303 37.4212C29.8303 38.0034 30.3022 38.4754 30.8844 38.4754Z" fill="white"/></g><defs><linearGradient id="mfi-g" x1="7.33595" y1="2.02029" x2="53.46" y2="62.0022" gradientUnits="userSpaceOnUse"><stop stop-color="#F0AC4E"/><stop offset="1" stop-color="#FFD98A"/></linearGradient><clipPath id="mfi-c"><rect width="58" height="58" fill="white" transform="translate(6.06265) rotate(6)"/></clipPath></defs>'),
  prestamoInicio: svg(65, 65, '<g clip-path="url(#mpi-c)"><path d="M30.142 6.38998C42.2963 6.91264 56.0525 12.2762 57.7586 26.1718C59.4648 40.0675 50.0092 53.3186 36.4792 58.0024C22.9492 62.6862 8.82737 54.345 6.00678 39.5787C3.1862 24.8124 12.6418 11.5613 22.3235 8.35748C25.1793 6.99932 27.0425 5.76304 30.142 6.38998Z" fill="url(#mpi-g)"/><path d="M36.6888 28.855H25.6888C24.5842 28.855 23.6888 29.7504 23.6888 30.855V36.855C23.6888 37.9596 24.5842 38.855 25.6888 38.855H36.6888C37.7934 38.855 38.6888 37.9596 38.6888 36.855V30.855C38.6888 29.7504 37.7934 28.855 36.6888 28.855Z" stroke="white" stroke-width="1.7"/><path d="M21.6888 42.855H40.6888L39.1888 39.855H23.1888L21.6888 42.855Z" stroke="white" stroke-width="1.7" stroke-linejoin="round"/></g><defs><linearGradient id="mpi-g" x1="2.23722" y1="9.39893" x2="61.2557" y2="55.6142" gradientUnits="userSpaceOnUse"><stop stop-color="#2E3192"/><stop offset="1" stop-color="#5B3B9E"/></linearGradient><clipPath id="mpi-c"><rect width="58" height="58" fill="white" transform="translate(0 7.06842) rotate(-7)"/></clipPath></defs>'),
  // "Nueva solicitud" (pantalla 2)
  fallaTipo: svg(65, 65, '<g clip-path="url(#mft-c)"><path d="M35.6085 5.5193C46.6484 5.86731 59.9347 12.5362 60.3355 25.6831C60.8582 37.8373 53.4404 49.0167 40.6768 54.5021C27.9132 59.9875 12.2762 56.0525 6.66891 44.2814C1.06165 32.5103 6.98174 17.117 17.8822 10.3953C24.4468 6.16383 29.5314 5.78063 35.6085 5.5193Z" fill="url(#mft-g)"/><path d="M33.7555 23.6074L44.0471 41.4824H23.4638L33.7555 23.6074Z" stroke="white" stroke-width="1.95" stroke-linejoin="round"/><path d="M33.7555 30.6491V35.5241" stroke="white" stroke-width="2.05833" stroke-linecap="round"/><path d="M33.7555 39.8032C34.4435 39.8032 35.0013 39.2454 35.0013 38.5574C35.0013 37.8693 34.4435 37.3116 33.7555 37.3116C33.0674 37.3116 32.5096 37.8693 32.5096 38.5574C32.5096 39.2454 33.0674 39.8032 33.7555 39.8032Z" fill="white"/></g><defs><linearGradient id="mft-g" x1="8.30628" y1="2.04221" x2="53.3764" y2="62.82" gradientUnits="userSpaceOnUse"><stop stop-color="#F0AC4E"/><stop offset="1" stop-color="#FFD98A"/></linearGradient><clipPath id="mft-c"><rect width="58" height="58" fill="white" transform="translate(7.06842) rotate(7)"/></clipPath></defs>'),
  prestamoTipo: svg(66, 66, '<g clip-path="url(#mpt-c)"><path d="M24.8959 5.583C37.6302 2.78348 52.6073 8.7572 57.5266 22.2034C62.4458 35.6497 56.4721 50.6268 43.3042 57.5266C30.1363 64.4263 13.3178 59.7212 7.40829 46.4142C1.49879 33.1071 6.34308 17.2789 15.4107 9.94554C18.1032 7.54748 20.9348 6.13969 24.8959 5.583Z" fill="url(#mpt-g)"/><path d="M37.3078 29.0868H25.3911C24.1945 29.0868 23.2244 30.0568 23.2244 31.2534V37.7534C23.2244 38.95 24.1945 39.9201 25.3911 39.9201H37.3078C38.5044 39.9201 39.4744 38.95 39.4744 37.7534V31.2534C39.4744 30.0568 38.5044 29.0868 37.3078 29.0868Z" stroke="white" stroke-width="1.84167"/><path d="M21.0577 44.2534H41.6411L40.0161 41.0034H22.6827L21.0577 44.2534Z" stroke="white" stroke-width="1.84167" stroke-linejoin="round"/></g><defs><linearGradient id="mpt-g" x1="0.97467" y1="8.86023" x2="63.7414" y2="55.3409" gradientUnits="userSpaceOnUse"><stop stop-color="#2E3192"/><stop offset="1" stop-color="#5B3B9E"/></linearGradient><clipPath id="mpt-c"><rect width="58" height="58" fill="white" transform="translate(0 8.07205) rotate(-8)"/></clipPath></defs>'),
};

/** Manchas de 58 px con su glifo. `variante` elige la exportación de Inicio o de "Nueva solicitud". */
export function Mancha58({ tipo, variante = 'inicio' }: { tipo: 'falla' | 'prestamo'; variante?: 'inicio' | 'tipo' }) {
  const clave = `${tipo}${variante === 'inicio' ? 'Inicio' : 'Tipo'}` as keyof typeof MANCHAS;
  const id = useIdSvg('m');
  const xml = MANCHAS[clave].replace(/(mfi|mpi|mft|mpt)-/g, `${id}-`);
  const tam = Number(/width="(\d+)"/.exec(xml)?.[1] ?? 64);
  // El marco de Figma mide 58; la exportación rotada sobresale unos píxeles, se centra sobre el marco.
  return (
    <SvgXml xml={xml} width={tam} height={tam} style={{ margin: (58 - tam) / 2 }} />
  );
}

// Manchas pequeñas (42 px) de "Próximas en tu cola" (pantalla 5). La forma y el glifo cambian por tipo.
const FORMA_MINI_A = 'M25.7683 4.4313C34.259 6.77996 43.0914 12.8052 42.0317 22.8876C40.9719 32.97 32.1418 40.7794 21.8323 41.8802C11.5228 42.981 2.91751 34.7953 3.33274 23.917C3.74796 13.0388 12.5782 5.22934 19.9313 4.54593C22.1675 4.05284 23.6835 3.48405 25.7683 4.4313Z';
const FORMA_MINI_B = 'M21.0363 3.63546C28.8825 2.08267 39.3434 4.62382 41.7677 13.8347C44.1164 22.3253 40.7037 31.4215 32.5915 37.371C24.4793 43.3206 12.8052 43.0913 6.93134 35.6993C1.05752 28.3072 2.72711 16.4817 9.32328 9.96344C13.2658 5.90843 16.791 4.80979 21.0363 3.63546Z';
const GLIFO_MINI_PRESTAMO = '<path d="M27.9861 18.9276H19.7361C18.9077 18.9276 18.2361 19.5992 18.2361 20.4276V24.9276C18.2361 25.7561 18.9077 26.4276 19.7361 26.4276H27.9861C28.8146 26.4276 29.4861 25.7561 29.4861 24.9276V20.4276C29.4861 19.5992 28.8146 18.9276 27.9861 18.9276Z" stroke="white" stroke-width="1.275"/><path d="M16.7361 29.4276H30.9861L29.8611 27.1776H17.8611L16.7361 29.4276Z" stroke="white" stroke-width="1.275" stroke-linejoin="round"/>';
const GLIFO_MINI_RAYO = '<path d="M23.1477 18.5591L16.3977 27.5591H21.6477L20.8977 33.5591L28.3977 23.8091H23.1477V18.5591Z" stroke="white" stroke-width="1.275" stroke-linecap="round" stroke-linejoin="round"/>';
// Glifos de 44 px reducidos al tamaño de los de la mancha pequeña (≈0,85) y centrados en ella.
const glifoMini = (g: Glifo) => `<g transform="translate(4.2 3.6) scale(0.85)">${GLIFOS_44[g]}</g>`;

const MINIS = {
  prestamo: { forma: FORMA_MINI_A, degradado: 'morado', glifo: GLIFO_MINI_PRESTAMO },
  electrica: { forma: FORMA_MINI_B, degradado: 'naranja', glifo: GLIFO_MINI_RAYO },
  falla: { forma: FORMA_MINI_B, degradado: 'naranja', glifo: glifoMini('alerta') },
  mantenimiento: { forma: FORMA_MINI_A, degradado: 'lavanda', glifo: glifoMini('calendario') },
  evento: { forma: FORMA_MINI_A, degradado: 'verde', glifo: glifoMini('camara') },
} as const;
export type TipoMini = keyof typeof MINIS;

export function Mancha42({ tipo }: { tipo: TipoMini }) {
  const m = MINIS[tipo];
  const id = useIdSvg('mm');
  const xml = svg(47, 47, `${defDegradado(id, DEGRADADOS[m.degradado])}<path d="${m.forma}" fill="url(#${id})"/>${m.glifo}`);
  return <SvgXml xml={xml} width={47} height={47} style={{ margin: -2.5 }} />;
}

// ---------- Iconos sueltos ----------
const XML = {
  campana: svg(19, 19, '<path d="M9.5 1.58333C8.15417 1.58333 7.125 2.6125 7.125 3.95833V4.19583C5.30417 4.90833 3.95833 6.65 3.95833 8.70833V12.6667L2.375 14.25V15.0417H16.625V14.25L15.0417 12.6667V8.70833C15.0417 6.65 13.6958 4.90833 11.875 4.19583V3.95833C11.875 2.6125 10.8458 1.58333 9.5 1.58333Z" stroke="white" stroke-width="1.34583" stroke-linejoin="round"/>'),
  buscar: svg(17, 17, '<path d="M7.79167 12.3958C10.3345 12.3958 12.3958 10.3345 12.3958 7.79167C12.3958 5.24886 10.3345 3.1875 7.79167 3.1875C5.24886 3.1875 3.1875 5.24886 3.1875 7.79167C3.1875 10.3345 5.24886 12.3958 7.79167 12.3958Z" stroke="#D8DEEE" stroke-width="1.34583"/><path d="M14.1667 14.1667L11.1917 11.1917" stroke="#D8DEEE" stroke-width="1.34583" stroke-linecap="round"/>'),
  chevron18: svg(18, 18, '<path d="M6.75 4.5L11.25 9L6.75 13.5" stroke="#BEC4E0" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"/>'),
  chevron16: svg(16, 16, '<path d="M6 4L10 8L6 12" stroke="#BEC4E0" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>'),
  chevron15: svg(15, 15, '<path d="M5.625 3.75L9.375 7.5L5.625 11.25" stroke="#BEC4E0" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>'),
  chevronAbajo: svg(18, 18, '<path d="M4.5 6.75L9 11.25L13.5 6.75" stroke="#BEC4E0" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'),
  atras: svg(40, 40, '<rect width="40" height="40" rx="20" fill="white" fill-opacity="0.14"/><rect x="0.5" y="0.5" width="39" height="39" rx="19.5" stroke="white" stroke-opacity="0.2"/><path d="M22.25 15.5L17.75 20L22.25 24.5" stroke="white" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"/>'),
  detectado: svg(44, 44, `${defDegradado('dg-verdeOscuro', DEGRADADOS.verdeOscuro)}<rect width="44" height="44" rx="22" fill="url(#dg-verdeOscuro)"/><path d="M16.1667 22.8333L19.9167 26.5833L27.8334 17.8333" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`),
  pasoCheck: svg(14, 14, '<path d="M2.91663 7.58333L5.54163 10.2083L11.0833 4.08333" stroke="white" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>'),
  telefono: svg(42, 42, '<rect width="42" height="42" rx="21" fill="#EEF0FC"/><path d="M16.875 15.375C16.875 15.375 18 15 18.75 16.875C19.275 18.15 18.375 18.6 18 19.125C17.625 19.65 19.125 22.875 20.25 23.625C20.775 24 21.15 22.875 22.35 22.875C23.85 22.875 24.375 24.375 24.375 24.375C24.75 25.5 23.625 26.625 22.5 26.625C19.5 26.625 15.375 22.5 15.375 19.5C15.375 18.375 16.875 15.375 16.875 15.375Z" stroke="#2E3192" stroke-width="1.2" stroke-linejoin="round"/>'),
  checkGrande: svg(46, 46, '<path d="M9.58337 24.9166L18.2084 33.5416L36.4167 13.4166" stroke="white" stroke-width="5.75" stroke-linecap="round" stroke-linejoin="round"/>'),
  escanearCentro: svg(100, 100, '<path d="M36.6667 12.5H17.5C14.7386 12.5 12.5 14.7386 12.5 17.5V36.6667C12.5 39.4281 14.7386 41.6667 17.5 41.6667H36.6667C39.4281 41.6667 41.6667 39.4281 41.6667 36.6667V17.5C41.6667 14.7386 39.4281 12.5 36.6667 12.5Z" stroke="white" stroke-opacity="0.35" stroke-width="6.66667"/><path d="M82.5 12.5H63.3334C60.5719 12.5 58.3334 14.7386 58.3334 17.5V36.6667C58.3334 39.4281 60.5719 41.6667 63.3334 41.6667H82.5C85.2615 41.6667 87.5 39.4281 87.5 36.6667V17.5C87.5 14.7386 85.2615 12.5 82.5 12.5Z" stroke="white" stroke-opacity="0.35" stroke-width="6.66667"/><path d="M36.6667 58.3333H17.5C14.7386 58.3333 12.5 60.5719 12.5 63.3333V82.5C12.5 85.2614 14.7386 87.5 17.5 87.5H36.6667C39.4281 87.5 41.6667 85.2614 41.6667 82.5V63.3333C41.6667 60.5719 39.4281 58.3333 36.6667 58.3333Z" stroke="white" stroke-opacity="0.35" stroke-width="6.66667"/><path d="M70.8333 60.4167H60.4166V70.8333H70.8333V60.4167Z" fill="white" fill-opacity="0.35"/><path d="M87.5 60.4167H77.0834V70.8333H87.5V60.4167Z" fill="white" fill-opacity="0.35"/><path d="M70.8333 77.0833H60.4166V87.5H70.8333V77.0833Z" fill="white" fill-opacity="0.35"/><path d="M87.5 77.0833H77.0834V87.5H87.5V77.0833Z" fill="white" fill-opacity="0.35"/>'),
  salir: svg(17, 17, '<path d="M10.625 12.0417L14.1667 8.50004L10.625 4.95837" stroke="#E8534A" stroke-width="1.275" stroke-linecap="round" stroke-linejoin="round"/><path d="M14.1667 8.5H6.375" stroke="#E8534A" stroke-width="1.275" stroke-linecap="round"/><path d="M6.375 2.83337H3.54167C2.7625 2.83337 2.125 3.47087 2.125 4.25004V12.75C2.125 13.5292 2.7625 14.1667 3.54167 14.1667H6.375" stroke="#E8534A" stroke-width="1.275" stroke-linecap="round"/>'),
  calendarioPequeno: svg(34, 34, '<rect width="34" height="34" rx="11" fill="#FCEBD1"/><path d="M20 12.3334H14C12.5273 12.3334 11.3334 13.5273 11.3334 15V20.3334C11.3334 21.8061 12.5273 23 14 23H20C21.4728 23 22.6667 21.8061 22.6667 20.3334V15C22.6667 13.5273 21.4728 12.3334 20 12.3334Z" stroke="#F0AC4E" stroke-width="1.13333"/><path d="M11.3334 15.6666H22.6667" stroke="#F0AC4E" stroke-width="1.13333"/><path d="M14.3334 11V13.3333M19.6667 11V13.3333" stroke="#F0AC4E" stroke-width="1.13333" stroke-linecap="round"/>'),
  mesAnterior: svg(30, 30, '<rect width="30" height="30" rx="15" fill="#EEF0FC"/><path d="M16.875 11.25L13.125 15L16.875 18.75" stroke="#0D1638" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>'),
  mesSiguiente: svg(30, 30, '<rect width="30" height="30" rx="15" fill="#EEF0FC"/><path d="M13.125 11.25L16.875 15L13.125 18.75" stroke="#0D1638" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>'),
};
export type NombreIcono = keyof typeof XML;

export const Icono = memo(({ nombre, tam }: { nombre: NombreIcono; tam?: number }) => {
  const id = useIdSvg('i');
  const xml = XML[nombre].replace(/dg-verdeOscuro/g, id);
  const w = Number(/width="(\d+)"/.exec(xml)?.[1]);
  return <SvgXml xml={xml} width={tam ?? w} height={tam ?? w} />;
});

// ---------- Barra de navegación inferior (el color cambia si la pestaña está activa) ----------
const NAV = {
  inicio: (c: string) => svg(20, 20, `<path d="M3.33333 9.16665L10 3.33331L16.6667 9.16665V16.6666H11.6667V11.6666H8.33333V16.6666H3.33333V9.16665Z" stroke="${c}" stroke-width="1.5" stroke-linejoin="round"/>`),
  servicios: (c: string) => svg(20, 20, ['M7.66666 3.33331H4.83333C4.0049 3.33331 3.33333 4.00489 3.33333 4.83331V7.66665C3.33333 8.49507 4.0049 9.16665 4.83333 9.16665H7.66666C8.49509 9.16665 9.16666 8.49507 9.16666 7.66665V4.83331C9.16666 4.00489 8.49509 3.33331 7.66666 3.33331Z', 'M15.1667 3.33331H12.3333C11.5049 3.33331 10.8333 4.00489 10.8333 4.83331V7.66665C10.8333 8.49507 11.5049 9.16665 12.3333 9.16665H15.1667C15.9951 9.16665 16.6667 8.49507 16.6667 7.66665V4.83331C16.6667 4.00489 15.9951 3.33331 15.1667 3.33331Z', 'M7.66666 10.8333H4.83333C4.0049 10.8333 3.33333 11.5049 3.33333 12.3333V15.1666C3.33333 15.9951 4.0049 16.6666 4.83333 16.6666H7.66666C8.49509 16.6666 9.16666 15.9951 9.16666 15.1666V12.3333C9.16666 11.5049 8.49509 10.8333 7.66666 10.8333Z', 'M15.1667 10.8333H12.3333C11.5049 10.8333 10.8333 11.5049 10.8333 12.3333V15.1666C10.8333 15.9951 11.5049 16.6666 12.3333 16.6666H15.1667C15.9951 16.6666 16.6667 15.9951 16.6667 15.1666V12.3333C16.6667 11.5049 15.9951 10.8333 15.1667 10.8333Z'].map((d) => `<path d="${d}" stroke="${c}" stroke-width="1.41667"/>`).join('')),
  estado: (c: string) => svg(20, 20, `<path d="M2.5 10H5.83333L7.91667 4.16669L12.0833 15.8334L14.1667 10H17.5" stroke="${c}" stroke-width="1.58333" stroke-linecap="round" stroke-linejoin="round"/>`),
  perfil: (c: string) => svg(20, 20, `<path d="M10 9.66669C11.6569 9.66669 13 8.32354 13 6.66669C13 5.00983 11.6569 3.66669 10 3.66669C8.34315 3.66669 7 5.00983 7 6.66669C7 8.32354 8.34315 9.66669 10 9.66669Z" stroke="${c}" stroke-width="1.5"/><path d="M3.75 16.6666C4.58333 13.75 6.91667 12.0833 10 12.0833C13.0833 12.0833 15.4167 13.75 16.25 16.6666" stroke="${c}" stroke-width="1.5" stroke-linecap="round"/>`),
};
export type IconoNav = keyof typeof NAV;

export const IconoNavegacion = memo(({ nombre, activo }: { nombre: IconoNav; activo: boolean }) => (
  <SvgXml xml={NAV[nombre](activo ? '#F0AC4E' : '#A6ADC7')} width={20} height={20} />
));
