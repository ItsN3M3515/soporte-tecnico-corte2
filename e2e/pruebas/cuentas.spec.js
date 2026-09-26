// @ts-check
const { test, expect } = require('@playwright/test');
const { InicioSesion, Inicio, VistaTecnico, VistaCoordinador } = require('../paginas');
const { foto } = require('../ayudas');

/**
 * RETO "Enfoque administrativo": cada cuenta tiene sus permisos.
 * La prueba es cambiar de usuario: se entra con cada cuenta de prueba, se comprueba a qué
 * pantalla llega y qué puede hacer, se cierra sesión y se entra con la siguiente.
 * Después se intenta lo prohibido: por la app (escribir la dirección del panel) y directo a la API.
 */
const API = 'http://localhost:3100/api';

test('cambiando de usuario, cada cuenta llega a su pantalla: docente, estudiante, técnico y coordinador', async ({ page }) => {
  const login = await new InicioSesion(page).abrir();

  // Docente → inicio del docente; en su perfil dice "Docente"
  await login.entrarComo('Docente');
  let inicio = await new Inicio(page).esperar();
  await expect(inicio.texto('Amy Jeanine')).toBeVisible();
  let perfil = await inicio.abrirPerfil();
  await expect(perfil.contiene('· Docente')).toBeVisible();
  await foto(page, 'Cuenta docente');
  await perfil.cerrarSesion();

  // Estudiante → las mismas pantallas; en su perfil dice "Estudiante"
  await login.entrarComo('Estudiante');
  inicio = await new Inicio(page).esperar();
  await expect(inicio.texto('Valentina Rojas')).toBeVisible();
  await expect(inicio.texto('Reportar falla de equipo')).toBeVisible(); // también reporta y reserva
  perfil = await inicio.abrirPerfil();
  await expect(perfil.contiene('· Estudiante')).toBeVisible();
  await foto(page, 'Cuenta estudiante');
  await perfil.cerrarSesion();

  // Técnico → su vista de trabajo, sin barra de docente
  await login.entrarComo('Técnico');
  const tecnico = await new VistaTecnico(page).esperar();
  await expect(page.getByRole('tab', { name: 'Servicios' })).toHaveCount(0);
  await foto(page, 'Cuenta tecnico');
  await tecnico.cerrarSesion();

  // Coordinador → panel del coordinador
  await login.entrarComo('Coordinador');
  const coordinador = await new VistaCoordinador(page).esperar();
  await expect(coordinador.texto('Escaladas hoy')).toBeVisible();
  await foto(page, 'Cuenta coordinador');
  await coordinador.cerrarSesion();
});

test('escribir la dirección del panel del coordinador en el navegador no lo abre: pide iniciar sesión', async ({ page }) => {
  await (await new InicioSesion(page).abrir()).entrarComo('Estudiante');
  await new Inicio(page).esperar();

  // La estudiante escribe la dirección del panel en la barra del navegador
  await page.goto('/coordinador');

  // La app no guarda la sesión en el navegador: al recargar hay que volver a entrar, y el panel no se muestra
  await new InicioSesion(page).esperar();
  await expect(page.getByText('Panel del coordinador')).toHaveCount(0);
  await expect(page.getByText('Escaladas hoy')).toHaveCount(0);
  await foto(page, 'Direccion del panel sin permiso');
});

test('directo a la API, sin pasar por la app, cada cuenta solo puede lo suyo (403 si no)', async ({ request }) => {
  const token = async (usuario, clave) => {
    const r = await request.post(`${API}/auth/login`, { data: { usuario, clave } });
    expect(r.ok()).toBeTruthy();
    return { Authorization: `Bearer ${(await r.json()).token}` };
  };
  const estudiante = await token('estudiante', 'estudiante123');
  const docente = await token('docente', 'docente123');
  const tecnico = await token('laura', 'tecnico123');
  const admin = await token('admin', 'admin123');

  // La estudiante reserva un PC (sí puede) …
  const reserva = await request.post(`${API}/solicitudes`, {
    headers: estudiante,
    data: { qr: 'SOPORTE:v1:CAM-H-201-PC01', tipo: 'PRESTAMO_EQUIPO', datos: { recurso: 'PORTATIL', cantidad: 1 } },
  });
  expect(reserva.status()).toBe(201);
  const { id } = await reserva.json();

  const casos = [
    ['estudiante ve su solicitud', 'get', `/solicitudes/${id}`, estudiante, 200],
    ['coordinador ve la solicitud', 'get', `/solicitudes/${id}`, admin, 200],
    ['docente NO ve la solicitud de la estudiante', 'get', `/solicitudes/${id}`, docente, 403],
    ['estudiante NO abre el panel del coordinador', 'get', '/admin/resumen', estudiante, 403],
    ['estudiante NO acepta como técnico', 'post', '/tecnicos/yo/aceptar', estudiante, 403],
    ['técnico NO crea solicitudes', 'post', '/solicitudes', tecnico, 403],
    ['técnico NO abre el panel del coordinador', 'get', '/admin/resumen', tecnico, 403],
    ['coordinador SÍ abre su panel', 'get', '/admin/resumen', admin, 200],
    ['sin sesión no entra nadie', 'get', '/solicitudes/mias', {}, 401],
  ];
  const resultados = [];
  for (const [que, metodo, ruta, headers, esperado] of casos) {
    const r = await request[metodo](`${API}${ruta}`, { headers, data: metodo === 'post' ? {} : undefined });
    resultados.push(`${r.status() === esperado ? '✓' : '✕'} ${que}: ${r.status()} (esperado ${esperado})`);
    expect.soft(r.status(), que).toBe(esperado);
  }
  await test.info().attach('permisos por cuenta', { body: resultados.join('\n'), contentType: 'text/plain' });
});
