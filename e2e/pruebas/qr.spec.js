// @ts-check
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { InicioSesion, Inicio } = require('../paginas');
const { foto } = require('../ayudas');

/**
 * RETOS "Reservar mediante QR" y "QR asociado al PC" probados en la app, en el navegador.
 * Nada del QR se escribe a mano: la app lo lee de la cámara (un video con el QR impreso)
 * o de la foto que sube la persona, y el backend dice qué equipo es y dónde está.
 */
const QR = (codigo) => path.join(__dirname, '..', '..', 'docs', 'qr', `${codigo}.png`);

async function entrar(page, rol) {
  await (await new InicioSesion(page).abrir()).entrarComo(rol);
  return new Inicio(page).esperar();
}

test('la cámara del navegador lee el QR del video beam y la docente dice qué le pasa y reporta la falla', async ({ page }) => {
  const inicio = await entrar(page, 'Docente');

  const escaner = await inicio.reportarFalla();
  await expect(escaner.camaraActiva()).toBeVisible();
  await expect(escaner.equipoDetectado('CAM-O-301-VB01')).toBeVisible(); // leído por la cámara
  await expect(escaner.contiene('Salón 301 · Edificio O')).toBeVisible(); // ubicación que dio el backend
  await foto(page, 'QR leído por la cámara del navegador');

  // Después de escanear, la docente dice QUÉ le pasa: las opciones son las de un video beam
  const falla = await escaner.reportarFallaDelEquipo();
  await expect(falla.opcion('No proyecta imagen')).toBeVisible();
  await expect(falla.opcion('Sin internet')).toHaveCount(0); // esa es de un PC, no de un video beam
  await expect(falla.boton('Enviar reporte')).toBeDisabled(); // sin elegir problema no se envía
  await falla.elegir('No proyecta imagen');
  await falla.describir('Enciende pero la pantalla queda en azul');
  await foto(page, 'Que le pasa al equipo');

  const confirmacion = await falla.enviar();
  expect(await confirmacion.numero()).toMatch(/^S-\d{4}$/);
  const seguimiento = await confirmacion.verSeguimiento();
  await expect(seguimiento.estado('Técnico asignado')).toBeVisible();
  await expect(seguimiento.contiene('No proyecta imagen: Enciende pero la pantalla queda en azul')).toBeVisible();
  await foto(page, 'Seguimiento de la solicitud creada desde el QR');
});

test('una estudiante sube la foto del QR del PC y reserva un equipo para ese salón', async ({ page }) => {
  const inicio = await entrar(page, 'Estudiante');
  const escaner = await inicio.reportarFalla();

  await escaner.subirFotoDelQr(QR('CAM-K-201-PC01'));
  await expect(escaner.equipoDetectado('CAM-K-201-PC01')).toBeVisible();

  const prestamo = await escaner.reservarEquipoParaEsteSalon();
  await expect(prestamo.salonElegido('Edificio K, Salón 201')).toBeVisible(); // el salón salió del QR
  await foto(page, 'Préstamo con el salón tomado del QR');
  const confirmacion = await prestamo.enviar();
  expect(await confirmacion.numero()).toMatch(/^S-\d{4}$/);
});

// qr-otro-sistema.png: un QR real con el texto "https://www.unisabana.edu.co" (de otra cosa, no de un equipo).
test('un QR que no es del sistema se lee pero se rechaza, y no se crea nada', async ({ page }) => {
  const inicio = await entrar(page, 'Docente');
  const escaner = await inicio.reportarFalla();
  await escaner.subirFotoDelQr(path.join(__dirname, '..', 'qr-otro-sistema.png'));

  await expect(escaner.error('El QR no pertenece al sistema de soporte.')).toBeVisible();
  await foto(page, 'QR de otro sistema rechazado');
  await expect(escaner.boton('Reportar falla de este equipo')).toHaveCount(0);
});
