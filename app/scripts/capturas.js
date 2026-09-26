/**
 * Recorre la app en el navegador y toma una captura por pantalla del prototipo (docs/capturas/).
 * No es una prueba de UI con aserciones (la bonificación pide Cypress/Selenium con Page Object);
 * sirve para regenerar las capturas y comprobar que ninguna pantalla lanza errores en consola.
 *
 * Requisitos: backend recién iniciado con BD nueva y MINUTOS_EN_COLA=1, app web servida
 * (npx expo export -p web y un servidor estático en el puerto 8081), y Playwright instalado.
 * Uso:  node app/scripts/capturas.js
 */
const path = require('node:path');
const { chromium } = require('playwright');
const API = process.env.API_URL || 'http://localhost:3000/api';
const WEB = process.env.WEB_URL || 'http://localhost:8081';
const SALIDA = process.env.SALIDA || path.join(__dirname, '..', '..', 'docs', 'capturas');
async function api(ruta, token, cuerpo) {
  const r = await fetch(API + ruta, { method: cuerpo ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
  const j = await r.json(); if (!r.ok) throw new Error(ruta + ' ' + JSON.stringify(j)); return j;
}
const login = async (u, c) => (await api('/auth/login', null, { usuario: u, clave: c })).token;
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const errores = [];
  p.on('pageerror', (e) => errores.push(e.message));
  p.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
  const foto = async (n, full = false) => { await p.waitForTimeout(1100); await p.screenshot({ path: path.join(SALIDA, `${n}.png`), fullPage: full }); };
  const clic = async (t) => { await p.getByText(t, { exact: true }).locator('visible=true').first().click(); await p.waitForTimeout(500); };
  const entrar = async (rol, url) => { await p.goto(WEB + '/'); await p.getByText(rol, { exact: true }).click(); await p.waitForURL('**' + url); };
  const tDoc = await login('docente', 'docente123');
  const [tLaura, tSofia] = [await login('laura', 'tecnico123'), await login('sofia', 'tecnico123')];

  // historial: un préstamo que Sofía ya entregó
  await api('/solicitudes', tDoc, { ubicacion: { edificio: 'Edificio H', salon: '102' }, tipo: 'PRESTAMO_EQUIPO', datos: { recurso: 'PORTATIL' } });
  for (const r of ['aceptar', 'llegada', 'finalizar']) await api('/tecnicos/yo/' + r, tSofia, {});

  await p.goto(WEB + '/'); await foto('00-inicio-sesion');
  await entrar('Docente', '/inicio');
  const falla = await api('/solicitudes', tDoc, { qr: 'SOPORTE:v1:CAM-O-301-VB01', tipo: 'FALLA_EQUIPO_FIJO' });
  await api('/tecnicos/yo/aceptar', tLaura, {});
  await foto('01-inicio');
  await clic('Servicios'); await foto('09-servicios');
  await clic('Perfil'); await foto('10-perfil');
  await clic('Notificaciones'); await foto('11-notificaciones'); await p.goBack(); await p.waitForTimeout(400);
  await clic('Mis solicitudes'); await foto('08-mis-solicitudes'); await p.goBack(); await p.waitForTimeout(400);
  await clic('Estado'); await foto('04-seguimiento-tiempo-real');
  await clic('Inicio');
  await clic('Reportar falla de equipo'); await foto('03a-escanear-qr');
  await clic('Buscar manualmente por edificio y salón'); await clic('Edificio K'); await clic('201'); await p.waitForTimeout(500); await foto('03a-busqueda-manual');
  await clic('Video Beam'); await foto('03a-equipo-detectado');
  await p.goBack(); await p.waitForTimeout(400);
  await clic('Solicitar préstamo de equipo'); await foto('03b-cuando-lo-necesitas');
  await clic('Lo necesito ahora'); await foto('03c-prestamo-configuracion'); await p.goBack(); await p.waitForTimeout(400);
  await clic('Agendar para después');
  await p.getByRole('button', { name: 'Ej: Edificio K, Salón 204' }).click(); await p.waitForTimeout(400);
  await clic('Edificio K'); await clic('202'); await clic('Confirmar ubicación');
  await p.getByLabel('Más').click();
  await p.getByRole('switch').first().click();
  await p.getByRole('button', { name: 'Elige fecha y hora' }).click(); await p.waitForTimeout(400);
  const manana = new Date(Date.now() + 86400000).getDate();
  await p.getByLabel(String(manana), { exact: true }).last().click();
  await clic('2:00 PM'); await foto('03c-calendario');
  await clic('Confirmar fecha'); await foto('03c-prestamo-agendado');
  await clic('Enviar solicitud'); await p.waitForURL('**/confirmacion**'); await foto('07-confirmacion-envio');
  await clic('Volver al inicio'); await p.waitForURL('**/inicio');
  await clic('Servicios'); await clic('Agendar mantenimiento'); await foto('12-agendar-mantenimiento'); await p.goBack(); await p.waitForTimeout(400);
  await clic('Soporte para eventos'); await foto('13-soporte-eventos'); await p.goBack(); await p.waitForTimeout(400);
  await clic('Reportar falla eléctrica'); await foto('14-falla-electrica');
  await p.goto(WEB + '/'); await entrar('Docente', '/inicio');
  await p.evaluate(() => { window.history.pushState({}, '', '/nueva'); window.dispatchEvent(new PopStateEvent('popstate')); }); await foto('02-elegir-tipo');

  // cola: todos los técnicos del campus ocupados y dos solicitudes esperando
  await api('/solicitudes', tDoc, { ubicacion: { edificio: 'Edificio K', salon: '102' }, tipo: 'PRESTAMO_EQUIPO', datos: { recurso: 'PORTATIL' } });
  await api('/solicitudes', tDoc, { ubicacion: { edificio: 'Edificio K', salon: '101' }, tipo: 'FALLA_ELECTRICA', datos: { tipoFalla: 'SIN_ENERGIA' } });
  await api('/solicitudes', tDoc, { qr: 'SOPORTE:v1:CAM-K-201-PC01', tipo: 'FALLA_EQUIPO_FIJO' });
  await api('/solicitudes', tDoc, { ubicacion: { edificio: 'Edificio K', salon: '301' }, tipo: 'PRESTAMO_EQUIPO', datos: { recurso: 'EXTENSION' } });
  await entrar('Técnico', '/tecnico'); await foto('05-vista-tecnico');
  await p.waitForTimeout(70000); // MINUTOS_EN_COLA=1: el programador escala lo que lleva 1 min en cola
  await entrar('Coordinador', '/coordinador'); await foto('06-panel-coordinador'); await foto('06-panel-coordinador-completo', true);
  await clic('Asignar manualmente'); await foto('06-asignar-manualmente');
  console.log(errores.length ? `Errores en consola: ${JSON.stringify(errores.slice(0, 10))}` : 'Capturas listas, sin errores en consola.');
  if (errores.length) process.exitCode = 1;
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
