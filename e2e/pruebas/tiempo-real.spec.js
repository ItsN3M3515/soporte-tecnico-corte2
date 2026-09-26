// @ts-check
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { InicioSesion, Inicio, VistaTecnico } = require('../paginas');
const { foto } = require('../ayudas');

/**
 * RETOS "Reporte en tiempo real" y "Multisede": dos personas en dos navegadores.
 * El técnico de la sede Norte tiene su pantalla abierta; cuando una docente del Norte escanea
 * un QR, la solicitud le aparece sin recargar, y al aceptarla la docente ve "Técnico en camino".
 */
const QR = (codigo) => path.join(__dirname, '..', '..', 'docs', 'qr', `${codigo}.png`);

test('el técnico del Norte ve aparecer la solicitud sin recargar y la docente ve que va en camino', async ({ browser }) => {
  const tecnico = await browser.newPage();
  const docente = await browser.newPage();

  // Andrés (técnico del Norte) con su pantalla abierta
  await tecnico.goto('/');
  await tecnico.getByPlaceholder('Ej: docente o estudiante').fill('andres');
  await tecnico.getByPlaceholder('Tu clave').fill('tecnico123');
  await tecnico.getByRole('button', { name: 'Entrar' }).click();
  const vista = await new VistaTecnico(tecnico).esperar();
  await expect(vista.texto('Sin solicitudes asignadas')).toBeVisible();

  // Docente del Norte
  await docente.goto('/');
  await docente.getByPlaceholder('Ej: docente o estudiante').fill('docente.norte');
  await docente.getByPlaceholder('Tu clave').fill('docente123');
  await docente.getByRole('button', { name: 'Entrar' }).click();
  const inicio = await new Inicio(docente).esperar();
  const escaner = await inicio.reportarFalla();
  await escaner.subirFotoDelQr(QR('NOR-BA-101-VB01'));
  await expect(escaner.equipoDetectado('NOR-BA-101-VB01')).toBeVisible();
  const falla = await escaner.reportarFallaDelEquipo();
  const seguimiento = await (await (await falla.elegir('No enciende')).enviar()).verSeguimiento();

  // Sin recargar la página del técnico:
  await expect(vista.solicitud('Video Beam · Salón 101')).toBeVisible();
  await expect(vista.contiene('No enciende')).toBeVisible(); // el técnico sabe qué revisar antes de ir
  await foto(tecnico, 'Tecnico ve que le pasa al equipo');
  await vista.aceptar();

  // Sin recargar la página de la docente:
  await expect(seguimiento.estado('Técnico en camino')).toBeVisible();
  await expect(seguimiento.contiene('Andrés Pardo')).toBeVisible();
  await test.info().attach('Docente: técnico en camino sin recargar', { body: await docente.screenshot(), contentType: 'image/png' });
});
