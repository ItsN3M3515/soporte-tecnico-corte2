/**
 * Qué le puede pasar a cada tipo de equipo. Al escanear el QR, la app muestra estas opciones
 * para que quien reporta diga QUÉ falla (no solo "falla el video beam"), y el técnico llegue sabiendo.
 * La lista la decide el dominio según el equipo que dice el QR; "Otro problema" pide describirlo.
 */
const OTRO = 'OTRO';

const POR_EQUIPO = new Map([
  ['Video Beam', [
    ['NO_ENCIENDE', 'No enciende'],
    ['SIN_IMAGEN', 'No proyecta imagen'],
    ['IMAGEN_DEFECTUOSA', 'Imagen borrosa o con colores raros'],
    ['NO_DETECTA_CABLE', 'No detecta el computador (HDMI)'],
    ['CONTROL', 'El control remoto no funciona'],
  ]],
  ['PC de salón', [
    ['NO_ENCIENDE', 'No enciende'],
    ['PANTALLA', 'La pantalla no muestra nada'],
    ['LENTO', 'Muy lento o se congela'],
    ['SIN_INTERNET', 'Sin internet'],
    ['PERIFERICOS', 'Teclado o mouse no funcionan'],
    ['SOFTWARE', 'Falta un programa o no abre'],
  ]],
]);

// Para un equipo que no está en el catálogo (p. ej. uno nuevo que se registre después).
const GENERICOS = [
  ['NO_ENCIENDE', 'No enciende'],
  ['NO_FUNCIONA', 'No funciona bien'],
];

/** Opciones de problema para un tipo de equipo, siempre con "Otro problema" al final. */
function problemasDe(descripcionEquipo) {
  const lista = POR_EQUIPO.get(descripcionEquipo) ?? GENERICOS;
  return [...lista, [OTRO, 'Otro problema']].map(([valor, texto]) => ({ valor, texto }));
}

/** Texto del problema elegido, o null si ese problema no aplica a ese equipo. */
function textoProblema(descripcionEquipo, valor) {
  return problemasDe(descripcionEquipo).find((p) => p.valor === valor)?.texto ?? null;
}

module.exports = { problemasDe, textoProblema, OTRO };
