# Evidencia de pruebas por reto

Para cada reto: qué exige, la decisión que lo atiende y **la prueba que lo demuestra**, con su código y el resultado de ejecutarla. Generado con `npm run evidencia` a partir de una sola ejecución de Jest; cualquiera de los comandos se puede correr en vivo desde `backend/`.

Para verlo como lista de chequeo en la terminal: `npm run retos`.

| Reto | Pruebas Jest | Pruebas en navegador |
|---|---|---|
| [1. Reservar mediante QR](#1-reservar-mediante-qr) | 8 | 2 |
| [2. QR asociado al PC](#2-qr-asociado-al-pc) | 5 | 1 |
| [3. Enfoque administrativo](#3-enfoque-administrativo) | 6 | 3 |
| [4. Reporte en tiempo real](#4-reporte-en-tiempo-real) | 4 | 1 |
| [5. Cola de prioridades](#5-cola-de-prioridades) | 5 | — |
| [6. Multisede (distribución y demanda)](#6-multisede-distribucion-y-demanda) | 4 | — |
| [7. Pantalla del trabajador](#7-pantalla-del-trabajador) | 4 | — |
| [8. Servicios del prototipo AsisTec (Figma)](#8-servicios-del-prototipo-asistec-figma) | 4 | — |

## 1. Reservar mediante QR

**Reto 1 de la lista del profesor.**  
**Qué exige:** Que el docente o el estudiante pida soporte o reserve un equipo escaneando el QR, sin llamar.  
**Atributo de calidad:** Usabilidad · Disponibilidad  
**Decisión:** Pantalla "3a - Escanear QR" (expo-camera) sobre el caso de uso `CrearSolicitud`; **Factory Method** `FabricaSolicitudes` con reglas por tipo.

### Integración con imagen real — `tests/integration/escaneoQR.int.test.js`

```js
test('escanear el QR impreso del video beam del salón 101 (Edificio K) crea la solicitud y la asigna a Laura', async () => {
  // Arrange: la imagen que está pegada en el equipo
  const png = impreso('CAM-K-101-VB01');

  // Act: la "cámara" lee el QR, la app muestra qué le puede pasar a ESE equipo, la docente elige y envía
  const leido = escanear(png);
  const equipo = (await e.como('docente').get(`/api/qr/resolver?qr=${encodeURIComponent(leido)}`)).body;
  const res = await e.como('docente').post('/api/solicitudes', {
    qr: leido,
    tipo: 'FALLA_EQUIPO_FIJO',
    claseEnCurso: true,
    datos: { problema: 'SIN_IMAGEN', descripcion: 'Enciende pero la pantalla queda en azul' },
  });

  // Assert
  expect(leido).toBe('SOPORTE:v1:CAM-K-101-VB01');
  expect(equipo.problemas.map((p) => p.texto)).toContain('No proyecta imagen');
  expect(res.status).toBe(201);
  expect(res.body).toMatchObject({ codigoEquipo: 'CAM-K-101-VB01', salon: '101', edificio: 'Edificio K', sede: 'CAMPUS', estado: 'ASIGNADA', tecnicoNombre: 'Laura Martínez' });
  expect(res.body.detalle).toBe('No proyecta imagen: Enciende pero la pantalla queda en azul'); // lo que lee el técnico
});
```

Ejecución: `npx jest tests/integration/escaneoQR.int.test.js -t "escanear el QR impreso del video beam"`

```
  ✓ escanear el QR impreso del video beam del salón 101 (Edificio K) crea la solicitud y la asigna a Laura (698 ms)

Tests: 1 passed, 1 total
```

### Integración: después de escanear, qué le pasa depende del equipo — `tests/integration/escaneoQR.int.test.js`

```js
test('las opciones dependen del equipo: el video beam y el PC del mismo salón tienen problemas distintos', async () => {
  const opciones = async (codigo) =>
    (await e.como('docente').get(`/api/qr/resolver?qr=${escanear(impreso(codigo))}`)).body.problemas.map((p) => p.valor);
  const vb = await opciones('CAM-O-301-VB01');
  const pc = await opciones('CAM-O-301-PC01');
  expect(vb).toContain('SIN_IMAGEN');
  expect(vb).not.toContain('SIN_INTERNET');
  expect(pc).toContain('SIN_INTERNET');
  expect(pc).not.toContain('CONTROL');
});
```

Ejecución: `npx jest tests/integration/escaneoQR.int.test.js -t "las opciones dependen del equipo"`

```
  ✓ las opciones dependen del equipo: el video beam y el PC del mismo salón tienen problemas distintos (659 ms)

Tests: 1 passed, 1 total
```

### Integración: problema que no aplica o "Otro" sin describir → 400 — `tests/integration/escaneoQR.int.test.js`

```js
test.each([
  ['un problema que no es de ese equipo (control remoto de un PC)', { problema: 'CONTROL' }],
  ['"Otro problema" sin describirlo', { problema: 'OTRO' }],
  ['un problema inventado', { problema: 'EXPLOTO' }],
])('se rechaza %s (400) y no se crea nada', async (_caso, datos) => {
  const res = await e.como('docente').post('/api/solicitudes', { qr: escanear(impreso('CAM-O-301-PC01')), tipo: 'FALLA_EQUIPO_FIJO', datos });
  expect(res.status).toBe(400);
  expect((await e.como('docente').get('/api/solicitudes/mias')).body.activas).toEqual([]);
});
```

Ejecución: `npx jest tests/integration/escaneoQR.int.test.js -t "se rechaza"`

```
  ✓ se rechaza un problema que no es de ese equipo (control remoto de un PC) (400) y no se crea nada (544 ms)
  ✓ se rechaza "Otro problema" sin describirlo (400) y no se crea nada (548 ms)
  ✓ se rechaza un problema inventado (400) y no se crea nada (538 ms)

Tests: 3 passed, 3 total
```

### Unitaria: qué le pasa al equipo (clases de equivalencia) — `tests/unit/dominio/FabricaSolicitudes.test.js`

```js
test.each([
  ['un problema de otro tipo de equipo (control remoto en un PC)', pc, { problema: 'CONTROL' }],
  ['un problema inexistente', videoBeam, { problema: 'EXPLOTO' }],
  ['"Otro problema" sin descripción', videoBeam, { problema: 'OTRO' }],
  ['"Otro problema" con descripción en blanco', videoBeam, { problema: 'OTRO', descripcion: '   ' }],
  ['una descripción de más de 200 caracteres', videoBeam, { problema: 'SIN_IMAGEN', descripcion: 'x'.repeat(MAX_DETALLE + 1) }],
])('rechaza %s', (_caso, eq, datos) => {
  expect(() => falla(eq, datos)).toThrow(DatoInvalido);
});
```

Ejecución: `npx jest tests/unit/dominio/FabricaSolicitudes.test.js -t "rechaza un problema"`

```
  ✓ rechaza un problema de otro tipo de equipo (control remoto en un PC) (3 ms)
  ✓ rechaza un problema inexistente (9 ms)

Tests: 2 passed, 2 total
```

### Integración con imagen real — `tests/integration/escaneoQR.int.test.js`

```js
test('reservar un portátil escaneando el QR del PC del salón 102 (Edificio H)', async () => {
  const leido = escanear(impreso('CAM-H-102-PC01'));

  const res = await e.como('docente').post('/api/solicitudes', { qr: leido, tipo: 'PRESTAMO_EQUIPO', detalle: 'PORTATIL' });

  expect(res.status).toBe(201);
  expect(res.body).toMatchObject({ tipo: 'PRESTAMO_EQUIPO', detalle: 'PORTATIL', salon: '102', tecnicoNombre: 'Sofía Gómez' });
});
```

Ejecución: `npx jest tests/integration/escaneoQR.int.test.js -t "reservar un portátil escaneando"`

```
  ✓ reservar un portátil escaneando el QR del PC del salón 102 (Edificio H) (518 ms)

Tests: 1 passed, 1 total
```

### Integración: una estudiante reserva por QR — `tests/integration/prototipo.int.test.js`

```js
test('una estudiante reserva un PC por QR y lo ve en "Mis solicitudes"; la docente no lo ve en las suyas', async () => {
  const login = await e.api.post('/api/auth/login').send({ usuario: 'estudiante', clave: 'estudiante123' });
  expect(login.body.perfil).toMatchObject({ rol: 'ESTUDIANTE', nombre: 'Valentina Rojas', sede: 'CAMPUS' });

  const res = await e.pedir('CAM-H-201-PC01', { tipo: 'PRESTAMO_EQUIPO', datos: { recurso: 'PORTATIL', cantidad: 1 } }, 'estudiante');
  expect(res.status).toBe(201);
  expect(res.body).toMatchObject({ creadaPor: 'estudiante', titulo: 'Préstamo de PC', salon: '201', edificio: 'Edificio H' });

  const suyas = (await e.como('estudiante').get('/api/solicitudes/mias')).body;
  const deLaDocente = (await e.como('docente').get('/api/solicitudes/mias')).body;
  expect(suyas.activas.map((s) => s.id)).toEqual([res.body.id]);
  expect(deLaDocente.activas).toEqual([]);
});
```

Ejecución: `npx jest tests/integration/prototipo.int.test.js -t "una estudiante reserva un PC por QR"`

```
  ✓ una estudiante reserva un PC por QR y lo ve en "Mis solicitudes"; la docente no lo ve en las suyas (666 ms)

Tests: 1 passed, 1 total
```

### Integración (QR dañado → búsqueda manual) — `tests/integration/prototipo.int.test.js`

```js
test('ubicaciones → equipos del salón → solicitud con el equipo elegido', async () => {
  const ubicaciones = (await e.como('docente').get('/api/ubicaciones')).body;
  const edificioO = ubicaciones.find((u) => u.sede === 'CAMPUS').edificios.find((x) => x.edificio === 'Edificio O');
  expect(edificioO.salones).toEqual(['101', '102', '201', '202', '301']);

  const equipos = (await e.como('docente').get('/api/equipos?edificio=Edificio%20O&salon=301')).body;
  expect(equipos.map((x) => x.descripcion)).toEqual(['PC de salón', 'Video Beam']);

  const vb = equipos.find((x) => x.descripcion === 'Video Beam');
  const res = await e.como('docente').post('/api/solicitudes', { codigoEquipo: vb.codigo, tipo: 'FALLA_EQUIPO_FIJO' });
  expect(res.status).toBe(201);
  expect(res.body).toMatchObject({ id: 'S-0001', titulo: 'Video Beam', salon: '301', edificio: 'Edificio O', estado: 'ASIGNADA' });
});
```

Ejecución: `npx jest tests/integration/prototipo.int.test.js -t "ubicaciones → equipos del salón"`

```
  ✓ ubicaciones → equipos del salón → solicitud con el equipo elegido (416 ms)

Tests: 1 passed, 1 total
```

### Unitaria (Factory Method) — `tests/unit/dominio/FabricaSolicitudes.test.js`

```js
test.each([[undefined], ['PROYECTOR'], ['']])('rechaza un préstamo con elemento "%s"', (detalle) => {
  expect(() => fabrica.crear({ tipo: 'PRESTAMO_EQUIPO', equipo, detalle, ahora })).toThrow(DatoInvalido);
});
```

Ejecución: `npx jest tests/unit/dominio/FabricaSolicitudes.test.js -t "rechaza un préstamo con elemento"`

```
  ✓ rechaza un préstamo con elemento "undefined" (2 ms)
  ✓ rechaza un préstamo con elemento "PROYECTOR" (1 ms)
  ✓ rechaza un préstamo con elemento "" (1 ms)

Tests: 3 passed, 3 total
```

### En la app, de punta a punta (navegador real con Playwright) — `e2e/`

Estas pruebas abren la app web en Chromium, inician sesión y hacen lo mismo que haría una persona. La cámara es un video falso con el QR impreso, así que la lectura del QR es real.

```js
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
```

Ejecución: `cd e2e && npx playwright test pruebas/qr.spec.js -g "la cámara del navegador lee el QR del video beam"`

```
  ✓ la cámara del navegador lee el QR del video beam y la docente dice qué le pasa y reporta la falla (3197 ms)
```

```js
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
```

Ejecución: `cd e2e && npx playwright test pruebas/qr.spec.js -g "una estudiante sube la foto del QR del PC"`

```
  ✓ una estudiante sube la foto del QR del PC y reserva un equipo para ese salón (2042 ms)
```

## 2. QR asociado al PC

**Reto 2 de la lista del profesor.**  
**Qué exige:** Cada QR identifica UN equipo; la ubicación la decide el servidor, no el QR.  
**Atributo de calidad:** Integridad · Seguridad  
**Decisión:** Objeto de valor `CodigoQR` (formato `SOPORTE:v1:<código>`) + tabla `equipos` con llave foránea; QR impreso con corrección de errores H.

### Integración con imágenes reales — `tests/integration/escaneoQR.int.test.js`

```js
test('los 61 QR impresos en docs/qr se leen y cada uno apunta a SU equipo registrado (QR asociado al PC)', async () => {
  // Arrange: las imágenes que se imprimen para pegar en los equipos (npm run qr)
  const equipos = new Map(generarEquipos().map((eq) => [eq.codigo, eq]));
  const archivos = fs.readdirSync(CARPETA_QR).filter((a) => a.endsWith('.png'));
  const token = await e.login('docente');

  for (const archivo of archivos) {
    // Act: escanear la imagen y preguntarle a la API qué equipo es
    const leido = escanear(impreso(archivo.replace('.png', '')));
    const res = await e.api.get('/api/qr/resolver').query({ qr: leido }).set('Authorization', `Bearer ${token}`);
    // Assert: el QR dice el código del archivo y la API responde con ESE equipo
    const codigo = archivo.replace('.png', '');
    expect(leido).toBe(`SOPORTE:v1:${codigo}`);
    expect(res.body).toMatchObject(equipos.get(codigo));
    // y trae las opciones de "¿qué le pasa?" de ESE tipo de equipo, con "Otro problema" al final
    expect(res.body.problemas.at(-1)).toEqual({ valor: 'OTRO', texto: 'Otro problema' });
  }
  expect(archivos).toHaveLength(61);
}, 30000);
```

Ejecución: `npx jest tests/integration/escaneoQR.int.test.js -t "los 61 QR impresos"`

```
  ✓ los 61 QR impresos en docs/qr se leen y cada uno apunta a SU equipo registrado (QR asociado al PC) (7352 ms)
  ✓ medido sobre los 61 QR impresos: con el 10 % rayado se leen al menos el 95 % (64450 ms)

Tests: 2 passed, 2 total
```

### Integración: QR manipulado — `tests/integration/escaneoQR.int.test.js`

```js
test('un QR copiado de otro salón NO puede cambiar la ubicación: manda la BD, no el QR', async () => {
  // Alguien intenta escribir su propia ubicación en el QR
  const falso = escanear(await QRCode.toBuffer('SOPORTE:v1:CAM-K-101-VB01:salon=O-105', { width: 300 }));

  const res = await e.como('docente').post('/api/solicitudes', { qr: falso, tipo: 'FALLA_EQUIPO_FIJO' });

  expect(res.status).toBe(400);
});
```

Ejecución: `npx jest tests/integration/escaneoQR.int.test.js -t "un QR copiado de otro salón"`

```
  ✓ un QR copiado de otro salón NO puede cambiar la ubicación: manda la BD, no el QR (1495 ms)

Tests: 1 passed, 1 total
```

### Integración: stickers rayados — `tests/integration/escaneoQR.int.test.js`

```js
test('con el 10 % del centro rayado, el QR impreso (nivel H) se sigue leyendo', async () => {
  const leido = escanear(rayarCentro(impreso('CAM-O-101-VB01'), 0.1));
  expect(leido).toBe('SOPORTE:v1:CAM-O-101-VB01');
});
```

Ejecución: `npx jest tests/integration/escaneoQR.int.test.js -t "con el 10 % del centro rayado"`

```
  ✓ con el 10 % del centro rayado, el QR impreso (nivel H) se sigue leyendo (1419 ms)

Tests: 1 passed, 1 total
```

### Integración: stickers rayados (medición) — `tests/integration/escaneoQR.int.test.js`

```js
test('medido sobre los 61 QR impresos: con el 10 % rayado se leen al menos el 95 %', () => {
  // Resultado medido al regenerar los QR del Corte 2: se leen 59 de 61. Los que no se leen con ese
  // rayón son CAM-O-201-VB01 y CAM-O-301-VB01. Para esos casos está la búsqueda manual de la app.
  const archivos = fs.readdirSync(CARPETA_QR).filter((f) => f.endsWith('.png'));
  const leidos = archivos.filter((f) => escanear(rayarCentro(fs.readFileSync(path.join(CARPETA_QR, f)), 0.1)) !== null);
  expect(leidos.length / archivos.length).toBeGreaterThanOrEqual(0.95);
}, 30000);
```

Ejecución: `npx jest tests/integration/escaneoQR.int.test.js -t "medido sobre los 61 QR"`

```
  ✓ medido sobre los 61 QR impresos: con el 10 % rayado se leen al menos el 95 % (64450 ms)

Tests: 1 passed, 1 total
```

### Unitaria: valores límite — `tests/unit/dominio/CodigoQR.test.js`

```js
test.each([LONGITUD_MIN_CODIGO - 1, LONGITUD_MAX_CODIGO + 1])('código de %i caracteres (fuera del borde) se rechaza', (longitud) => {
  const texto = `SOPORTE:v1:${codigoDeLongitud(longitud)}`;
  expect(() => CodigoQR.desdeTexto(texto)).toThrow('debe tener entre');
});
```

Ejecución: `npx jest tests/unit/dominio/CodigoQR.test.js -t "caracteres (fuera del borde)"`

```
  ✓ código de 4 caracteres (fuera del borde) se rechaza (1 ms)
  ✓ código de 41 caracteres (fuera del borde) se rechaza (0 ms)

Tests: 2 passed, 2 total
```

### En la app, de punta a punta (navegador real con Playwright) — `e2e/`

Estas pruebas abren la app web en Chromium, inician sesión y hacen lo mismo que haría una persona. La cámara es un video falso con el QR impreso, así que la lectura del QR es real.

```js
test('un QR que no es del sistema se lee pero se rechaza, y no se crea nada', async ({ page }) => {
  const inicio = await entrar(page, 'Docente');
  const escaner = await inicio.reportarFalla();
  await escaner.subirFotoDelQr(path.join(__dirname, '..', 'qr-otro-sistema.png'));

  await expect(escaner.error('El QR no pertenece al sistema de soporte.')).toBeVisible();
  await foto(page, 'QR de otro sistema rechazado');
  await expect(escaner.boton('Reportar falla de este equipo')).toHaveCount(0);
});
```

Ejecución: `cd e2e && npx playwright test pruebas/qr.spec.js -g "un QR que no es del sistema se lee pero se rechaza"`

```
  ✓ un QR que no es del sistema se lee pero se rechaza, y no se crea nada (1608 ms)
```

## 3. Enfoque administrativo

**Reto 3 de la lista del profesor.**  
**Qué exige:** Roles con permisos distintos (docente, estudiante, técnico, coordinador) y un panel de coordinación que actúe, no solo mire.  
**Atributo de calidad:** Seguridad · Mantenibilidad  
**Decisión:** Roles en el JWT verificados en el adaptador HTTP; pantalla "6 - Panel del coordinador" con `Consultas.resumenHoy()`, `Consultas.escaladas()` y el caso de uso `AsignarManualmente`.

### Integración: roles — `tests/integration/api.int.test.js`

```js
test('un técnico no puede ver el panel administrativo (403)', async () => {
  const res = await e.como('laura').get('/api/admin/demanda');
  expect(res.status).toBe(403);
});
```

Ejecución: `npx jest tests/integration/api.int.test.js -t "un técnico no puede ver el panel administrativo"`

```
  ✓ un técnico no puede ver el panel administrativo (403) (422 ms)

Tests: 1 passed, 1 total
```

### Integración: una estudiante no entra al panel ni a acciones de técnico — `tests/integration/prototipo.int.test.js`

```js
test.each([
  ['get', '/api/admin/resumen'],
  ['post', '/api/tecnicos/yo/aceptar'],
])('una estudiante no entra a %s %s (403)', async (metodo, url) => {
  expect((await e.como('estudiante')[metodo](url, {})).status).toBe(403);
});
```

Ejecución: `npx jest tests/integration/prototipo.int.test.js -t "una estudiante no entra"`

```
  ✓ una estudiante no entra a get /api/admin/resumen (403) (439 ms)
  ✓ una estudiante no entra a post /api/tecnicos/yo/aceptar (403) (461 ms)

Tests: 2 passed, 2 total
```

### Integración: cada cuenta ve solo el detalle de SUS solicitudes — `tests/integration/prototipo.int.test.js`

```js
test('cada cuenta ve solo el detalle de SUS solicitudes: la docente no abre el seguimiento de la estudiante (403)', async () => {
  const res = await e.pedir('CAM-H-201-PC01', { tipo: 'PRESTAMO_EQUIPO', datos: { recurso: 'PORTATIL', cantidad: 1 } }, 'estudiante');
  const url = `/api/solicitudes/${res.body.id}`;
  expect((await e.como('estudiante').get(url)).status).toBe(200);
  expect((await e.como('admin').get(url)).status).toBe(200);
  const ajena = await e.como('docente').get(url);
  expect(ajena.status).toBe(403);
  expect(ajena.body.codigo).toBe('ACCESO_DENEGADO');
});
```

Ejecución: `npx jest tests/integration/prototipo.int.test.js -t "cada cuenta ve solo el detalle de SUS solicitudes"`

```
  ✓ cada cuenta ve solo el detalle de SUS solicitudes: la docente no abre el seguimiento de la estudiante (403) (546 ms)

Tests: 1 passed, 1 total
```

### Unitaria: quién NO puede ver una solicitud (clases de equivalencia) — `tests/unit/aplicacion/CasosDeUso.test.js`

```js
test.each([
  ['una estudiante que no la creó', { usuario: 'estudiante', rol: 'ESTUDIANTE', sede: 'CAMPUS' }],
  ['otro docente de la misma sede', { usuario: 'otro.docente', rol: 'DOCENTE', sede: 'CAMPUS' }],
  ['un técnico de otra sede', { usuario: 'andres', rol: 'TECNICO', sede: 'NORTE', tecnicoId: 'T-ANDRES' }],
])('NO la ve %s (AccesoDenegado → 403)', (_quien, perfil) => {
  const ctx = armar();
  const s = pedirFalla(ctx);
  expect(() => ctx.consultas.estadoSolicitud(s.id, perfil)).toThrow(AccesoDenegado);
});
```

Ejecución: `npx jest tests/unit/aplicacion/CasosDeUso.test.js -t "NO la ve"`

```
  ✓ NO la ve una estudiante que no la creó (AccesoDenegado → 403) (3 ms)
  ✓ NO la ve otro docente de la misma sede (AccesoDenegado → 403) (1 ms)
  ✓ NO la ve un técnico de otra sede (AccesoDenegado → 403) (1 ms)

Tests: 3 passed, 3 total
```

### Integración: panel del coordinador — `tests/integration/prototipo.int.test.js`

```js
test('pantalla 6: tarjetas del día, escaladas con motivo y "Asignar manualmente" con un técnico de otra sede', async () => {
  for (const salon of ['101', '102', '201', '202']) await e.pedir(`CAM-O-${salon}-VB01`); // 3 técnicos del campus + 1 en cola
  for (const tecnico of ['laura', 'miguel', 'sofia']) await e.como(tecnico).post('/api/tecnicos/yo/aceptar');
  e.reloj.avanzarMinutos(10);
  await e.como('admin').post('/api/admin/escalar');

  const escaladas = (await e.como('admin').get('/api/admin/escaladas')).body;
  expect(escaladas).toHaveLength(1);
  expect(escaladas[0].motivoEscalacion).toBe('Sin técnicos disponibles cercanos');

  const asignada = await e.como('admin').post(`/api/admin/solicitudes/${escaladas[0].id}/asignar`, { tecnicoId: 'T-ANDRES' });
  expect(asignada.body).toMatchObject({ estado: 'ASIGNADA', tecnicoId: 'T-ANDRES', sede: 'CAMPUS' });

  const resumen = (await e.como('admin').get('/api/admin/resumen')).body;
  expect(resumen).toMatchObject({ escaladasHoy: 1, resueltasHoy: 0 });
});
```

Ejecución: `npx jest tests/integration/prototipo.int.test.js -t "pantalla 6: tarjetas del día"`

```
  ✓ pantalla 6: tarjetas del día, escaladas con motivo y "Asignar manualmente" con un técnico de otra sede (706 ms)

Tests: 1 passed, 1 total
```

### Unitaria: "hoy" en hora de Bogotá — `tests/unit/aplicacion/CasosDeUsoPrototipo.test.js`

```js
test('"hoy" en el panel es el día en Bogotá (UTC-5): lo resuelto antes de la medianoche local no cuenta', () => {
  const ctx = armar({ tecnicos: [f.nuevoTecnico('T-LAURA', 'CAMPUS', 'Edificio K')] });
  ctx.reloj.t = Date.UTC(2026, 8, 23, 4, 30); // 11:30 p. m. del 22 en Bogotá
  pedirFalla(ctx);
  ctx.atender.aceptar('T-LAURA');
  ctx.atender.confirmarLlegada('T-LAURA');
  ctx.reloj.avanzarMinutos(20); // 11:50 p. m.
  ctx.atender.finalizar('T-LAURA');
  expect(ctx.consultas.resumenHoy()).toMatchObject({ resueltasHoy: 1, minutosPromedioResolucion: 20 });

  ctx.reloj.avanzarMinutos(20); // 12:10 a. m. del 23: día nuevo
  expect(ctx.consultas.resumenHoy()).toMatchObject({ resueltasHoy: 0, escaladasHoy: 0, minutosPromedioResolucion: null });
});
```

Ejecución: `npx jest tests/unit/aplicacion/CasosDeUsoPrototipo.test.js -t ""hoy" en el panel es el día en Bogotá"`

```
  ✓ "hoy" en el panel es el día en Bogotá (UTC-5): lo resuelto antes de la medianoche local no cuenta (1 ms)

Tests: 1 passed, 1 total
```

### En la app, de punta a punta (navegador real con Playwright) — `e2e/`

Estas pruebas abren la app web en Chromium, inician sesión y hacen lo mismo que haría una persona. La cámara es un video falso con el QR impreso, así que la lectura del QR es real.

```js
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
```

Ejecución: `cd e2e && npx playwright test pruebas/cuentas.spec.js -g "cambiando de usuario, cada cuenta llega a su pantalla"`

```
  ✓ cambiando de usuario, cada cuenta llega a su pantalla: docente, estudiante, técnico y coordinador (3712 ms)
```

```js
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
```

Ejecución: `cd e2e && npx playwright test pruebas/cuentas.spec.js -g "escribir la dirección del panel del coordinador"`

```
  ✓ escribir la dirección del panel del coordinador en el navegador no lo abre: pide iniciar sesión (1866 ms)
```

```js
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
```

Ejecución: `cd e2e && npx playwright test pruebas/cuentas.spec.js -g "directo a la API, sin pasar por la app"`

```
  ✓ directo a la API, sin pasar por la app, cada cuenta solo puede lo suyo (403 si no) (336 ms)
```

## 4. Reporte en tiempo real

**Reto 4 de la lista del profesor.**  
**Qué exige:** Que técnico, docente y coordinador vean los cambios sin recargar.  
**Atributo de calidad:** Rendimiento · Usabilidad  
**Decisión:** Puerto `PublicadorEventos` + adaptador Socket.IO con salas por rol, sede y usuario (ADR-003); **Decorator** `NotificacionesDocente` guarda los avisos del docente.

### Integración productor→consumidor (sockets reales) — `tests/integration/tiempoReal.int.test.js`

```js
test('el técnico recibe la solicitud asignada sin recargar la pantalla', async () => {
  const laura = await clienteDe('laura');
  const llegada = esperarEvento(laura, 'solicitud:asignada');

  const creada = (await e.pedir('CAM-K-101-VB01')).body;

  const evento = await llegada;
  expect(evento).toMatchObject({ id: creada.id, salon: '101', tecnicoId: 'T-LAURA' });
});
```

Ejecución: `npx jest tests/integration/tiempoReal.int.test.js -t "el técnico recibe la solicitud asignada"`

```
  ✓ el técnico recibe la solicitud asignada sin recargar la pantalla (591 ms)

Tests: 1 passed, 1 total
```

### Integración: el docente ve el cambio y recibe el aviso — `tests/integration/prototipo.int.test.js`

```js
test('cuando el técnico acepta, al docente le llegan el cambio de estado y el aviso', async () => {
  socket = conectar(`http://localhost:${servidor.address().port}`, { auth: { token: await e.login('docente') }, transports: ['websocket'], forceNew: true });
  const salas = await new Promise((ok) => socket.on('conectado', ok));
  expect(salas.salas).toContain('usuario:docente');

  await e.pedir('CAM-K-101-VB01');
  const aceptada = new Promise((ok) => socket.on('solicitud:aceptada', ok));
  const aviso = new Promise((ok) => socket.on('notificacion:nueva', (n) => n.titulo === 'Técnico asignado' && ok(n)));
  await e.como('laura').post('/api/tecnicos/yo/aceptar');

  expect(await aceptada).toMatchObject({ estado: 'EN_ATENCION', creadaPor: 'docente' });
  expect(await aviso).toMatchObject({ mensaje: 'Laura va en camino a Salón 101' });
});
```

Ejecución: `npx jest tests/integration/prototipo.int.test.js -t "cuando el técnico acepta, al docente"`

```
  ✓ cuando el técnico acepta, al docente le llegan el cambio de estado y el aviso (511 ms)

Tests: 1 passed, 1 total
```

### Unitaria: avisos del docente (Decorator) — `tests/unit/aplicacion/CasosDeUsoPrototipo.test.js`

```js
test('cada cambio de SU solicitud le llega al docente como aviso y en su sala', () => {
  const ctx = armar({ tecnicos: [f.nuevoTecnico('T-LAURA', 'CAMPUS', 'Edificio K')] });
  pedirFalla(ctx);
  ctx.atender.aceptar('T-LAURA');
  ctx.atender.confirmarLlegada('T-LAURA');
  ctx.atender.finalizar('T-LAURA');

  const { items, noLeidas } = ctx.notificaciones.listar('docente');

  expect(items.map((n) => n.titulo)).toEqual(['Solicitud resuelta', 'Técnico en el salón', 'Técnico asignado', 'Actualización de estado']);
  expect(items[2].mensaje).toBe('T-LAURA va en camino a Salón 101');
  expect(noLeidas).toBe(4);
  expect(ctx.espia.publicar).toHaveBeenCalledWith('notificacion:nueva', expect.any(Object), ['usuario:docente']);
  expect(ctx.notificaciones.marcarLeidas('docente')).toEqual({ marcadas: 4 });
  expect(ctx.notificaciones.listar('docente').noLeidas).toBe(0);
});
```

Ejecución: `npx jest tests/unit/aplicacion/CasosDeUsoPrototipo.test.js -t "cada cambio de SU solicitud"`

```
  ✓ cada cambio de SU solicitud le llega al docente como aviso y en su sala (9 ms)

Tests: 1 passed, 1 total
```

### Integración: seguridad del canal — `tests/integration/tiempoReal.int.test.js`

```js
test('una conexión sin token válido es rechazada', async () => {
  const socket = conectar(url, { auth: { token: 'falso' }, transports: ['websocket'], forceNew: true });
  clientes.push(socket);
  const error = await new Promise((ok) => socket.on('connect_error', ok));
  expect(error.message).toMatch(/Sesión inválida/);
});
```

Ejecución: `npx jest tests/integration/tiempoReal.int.test.js -t "una conexión sin token"`

```
  ✓ una conexión sin token válido es rechazada (385 ms)

Tests: 1 passed, 1 total
```

### En la app, de punta a punta (navegador real con Playwright) — `e2e/`

Estas pruebas abren la app web en Chromium, inician sesión y hacen lo mismo que haría una persona. La cámara es un video falso con el QR impreso, así que la lectura del QR es real.

```js
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
```

Ejecución: `cd e2e && npx playwright test pruebas/tiempo-real.spec.js -g "el técnico del Norte ve aparecer la solicitud sin recargar"`

```
  ✓ el técnico del Norte ve aparecer la solicitud sin recargar y la docente ve que va en camino (3932 ms)
```

## 5. Cola de prioridades

**Reto 4 de la lista del profesor.**  
**Qué exige:** Si no hay técnicos libres, atender primero lo urgente sin que lo demás espere para siempre.  
**Atributo de calidad:** Rendimiento · Equidad  
**Decisión:** Montículo `ColaPrioridad` + **Strategy** `PoliticaImpactoYEspera` (impacto + envejecimiento). Las solicitudes agendadas entran a la cola 30 min antes (`ActivarProgramadas`).

### Unitaria: aging, valores límite — `tests/unit/dominio/Prioridad.test.js`

```js
test.each([
  [0, 0],
  [1, PUNTOS_POR_MINUTO],
  [TOPE_MINUTOS_AGING - 1, (TOPE_MINUTOS_AGING - 1) * PUNTOS_POR_MINUTO],
  [TOPE_MINUTOS_AGING, TOPE_MINUTOS_AGING * PUNTOS_POR_MINUTO],
  [TOPE_MINUTOS_AGING + 1, TOPE_MINUTOS_AGING * PUNTOS_POR_MINUTO],
  [600, TOPE_MINUTOS_AGING * PUNTOS_POR_MINUTO],
])('tras %i minutos suma %i puntos de espera', (m, extra) => {
  const s = nuevaSolicitud({ tipo: 'PRESTAMO_EQUIPO', claseEnCurso: false, creadaEn: T0 });
  expect(politica.calcular(s, minutos(m))).toBe(PUNTOS_BASE.get('PRESTAMO_EQUIPO').sinClase + extra);
});
```

Ejecución: `npx jest tests/unit/dominio/Prioridad.test.js -t "puntos de espera"`

```
  ✓ tras 0 minutos suma 0 puntos de espera (0 ms)
  ✓ tras 1 minutos suma 2 puntos de espera (0 ms)
  ✓ tras 59 minutos suma 118 puntos de espera (0 ms)
  ✓ tras 60 minutos suma 120 puntos de espera (1 ms)
  ✓ tras 61 minutos suma 120 puntos de espera (6 ms)
  ✓ tras 600 minutos suma 120 puntos de espera (1 ms)

Tests: 6 passed, 6 total
```

### Unitaria: sin inanición — `tests/unit/dominio/Prioridad.test.js`

```js
test('una solicitud de baja prioridad que espera lo suficiente supera a una urgente recién llegada (sin inanición)', () => {
  const vieja = nuevaSolicitud({ tipo: 'PRESTAMO_EQUIPO', claseEnCurso: false, creadaEn: T0 });
  const urgente = nuevaSolicitud({ tipo: 'FALLA_EQUIPO_FIJO', claseEnCurso: true, creadaEn: minutos(40) });
  const ahora = minutos(40);

  expect(politica.calcular(vieja, ahora)).toBeGreaterThan(politica.calcular(urgente, ahora));
});
```

Ejecución: `npx jest tests/unit/dominio/Prioridad.test.js -t "sin inanición"`

```
  ✓ una solicitud de baja prioridad que espera lo suficiente supera a una urgente recién llegada (sin inanición) (1 ms)

Tests: 1 passed, 1 total
```

### Unitaria: orden de los servicios nuevos — `tests/unit/dominio/ServiciosPrototipo.test.js`

```js
test('con clase en curso: falla de equipo > falla eléctrica > evento > préstamo > mantenimiento', () => {
  const tipos = ['MANTENIMIENTO', 'PRESTAMO_EQUIPO', 'SOPORTE_EVENTO', 'FALLA_ELECTRICA', 'FALLA_EQUIPO_FIJO'];
  const solicitudes = tipos.map((tipo) => nuevaSolicitud({ id: tipo, tipo, claseEnCurso: true, creadaEn: AHORA }));

  const orden = ColaPrioridad.desde(solicitudes, new PoliticaImpactoYEspera(), AHORA).aListaOrdenada().map((c) => c.solicitud.id);

  expect(orden).toEqual(['FALLA_EQUIPO_FIJO', 'FALLA_ELECTRICA', 'SOPORTE_EVENTO', 'PRESTAMO_EQUIPO', 'MANTENIMIENTO']);
});
```

Ejecución: `npx jest tests/unit/dominio/ServiciosPrototipo.test.js -t "falla de equipo > falla eléctrica"`

```
  ✓ con clase en curso: falla de equipo > falla eléctrica > evento > préstamo > mantenimiento (0 ms)

Tests: 1 passed, 1 total
```

### Unitaria: agenda → cola (valor límite 29/30 min) — `tests/unit/aplicacion/CasosDeUsoPrototipo.test.js`

```js
test('entra a la cola 30 min antes de la hora pedida, no antes', () => {
  const ctx = armar({ tecnicos: [f.nuevoTecnico('T-LAURA', 'CAMPUS', 'Edificio K')] });
  const v = pedirPrestamo(ctx, { programadaPara: ctx.reloj.ahora() + 60 * MIN });

  ctx.reloj.avanzarMinutos(29);
  expect(ctx.activar.ejecutar()).toEqual([]);

  ctx.reloj.avanzarMinutos(1);
  expect(ctx.activar.ejecutar()).toEqual([{ id: v.id, accion: 'ACTIVADA_Y_ASIGNADA' }]);
  expect(ctx.repoSolicitudes.buscarPorId(v.id)).toMatchObject({ estado: 'ASIGNADA', tecnicoId: 'T-LAURA' });
  expect(eventos(ctx.espia)).toEqual(expect.arrayContaining(['solicitud:activada', 'solicitud:asignada']));
});
```

Ejecución: `npx jest tests/unit/aplicacion/CasosDeUsoPrototipo.test.js -t "entra a la cola 30 min antes"`

```
  ✓ entra a la cola 30 min antes de la hora pedida, no antes (1 ms)

Tests: 1 passed, 1 total
```

### Sistema (caja negra) — `tests/integration/flujoSistema.e2e.test.js`

```js
test('de escanear el QR a resolver, con cola de prioridades y panel admin', async () => {
  const e = crearEntorno();

  // 1. tres solicitudes con técnicos disponibles
  const asignadas = [];
  for (const salon of ['101', '102', '201']) {
    const r = await e.pedir(`CAM-O-${salon}-VB01`);
    expect(r.status).toBe(201);
    asignadas.push(r.body);
  }
  expect(asignadas.map((s) => s.tecnicoNombre)).toEqual(['Laura Martínez', 'Miguel Rodríguez', 'Sofía Gómez']); // K y Ad Portas son cercanos a O; Sofía por sede

  // 2. cola
  e.reloj.avanzarMinutos(1);
  const prestamo = (await e.pedir('CAM-O-202-PC01', { tipo: 'PRESTAMO_EQUIPO', detalle: 'PORTATIL', claseEnCurso: false })).body;
  e.reloj.avanzarMinutos(1);
  const urgente = (await e.pedir('CAM-O-301-VB01')).body;
  expect([prestamo.estado, urgente.estado]).toEqual(['PENDIENTE', 'PENDIENTE']);

  const panelLaura = (await e.como('laura').get('/api/tecnicos/yo/panel')).body;
  expect(panelLaura.colaSede.items.map((c) => c.id)).toEqual([urgente.id, prestamo.id]);

  // 3. Laura atiende y termina
  await e.como('laura').post('/api/tecnicos/yo/aceptar');
  e.reloj.avanzarMinutos(3);
  await e.como('laura').post('/api/tecnicos/yo/llegada');
  e.reloj.avanzarMinutos(10);
  const fin = (await e.como('laura').post('/api/tecnicos/yo/finalizar')).body;

  expect(fin.solicitud.estado).toBe('RESUELTA');
  expect(fin.siguiente.id).toBe(urgente.id);

  // 4a. el docente consulta
  const miSolicitud = (await e.como('docente').get(`/api/solicitudes/${prestamo.id}`)).body;
  expect(miSolicitud).toMatchObject({ estado: 'PENDIENTE', posicionEnCola: 1 });

  // 4b. el admin ve la demanda
  const campus = (await e.como('admin').get('/api/admin/demanda')).body.find((d) => d.sede === 'CAMPUS');
  expect(campus).toMatchObject({ enCola: 1, enAtencion: 3, resueltas24h: 1, tecnicosDisponibles: 0, deficitTecnicos: 1 });
  expect(campus.demandaPorEdificio).toEqual([{ edificio: 'Edificio O', total: 5 }]);
});
```

Ejecución: `npx jest tests/integration/flujoSistema.e2e.test.js -t "de escanear el QR a resolver"`

```
  ✓ de escanear el QR a resolver, con cola de prioridades y panel admin (669 ms)

Tests: 1 passed, 1 total
```

## 6. Multisede (distribución y demanda)

**Reto 5 de la lista del profesor.**  
**Qué exige:** Cada sede atiende con sus técnicos; el coordinador ve demanda y déficit por sede y puede redistribuir.  
**Atributo de calidad:** Escalabilidad · Disponibilidad  
**Decisión:** Búsqueda restringida por sede con **Decorator** doble; métricas por sede; "Asignar manualmente" permite mandar un técnico de otra sede.

### Unitaria — `tests/unit/dominio/Asignacion.test.js`

```js
test('NUNCA asigna un técnico de otra sede aunque sea el único libre', () => {
  const tecnicos = [nuevoTecnico('ANDRES', 'NORTE', 'Bloque A'), nuevoTecnico('LAURA', 'CAMPUS', 'Edificio K', 'ASIGNADO')];
  const s = nuevaSolicitud({ edificio: 'Edificio K', sede: 'CAMPUS' });

  expect(busquedaCompleta().buscarTecnico(s, tecnicos)).toBeNull();
});
```

Ejecución: `npx jest tests/unit/dominio/Asignacion.test.js -t "NUNCA asigna un técnico de otra sede"`

```
  ✓ NUNCA asigna un técnico de otra sede aunque sea el único libre (1 ms)

Tests: 1 passed, 1 total
```

### Integración — `tests/integration/api.int.test.js`

```js
test('si el NORTE está saturado, la solicitud espera en la cola del NORTE aunque el CAMPUS tenga técnicos libres', async () => {
  await e.pedir('NOR-BA-101-VB01', {}, 'docente.norte');
  const res = await e.pedir('NOR-BB-101-VB01', {}, 'docente.norte');

  expect(res.body.estado).toBe('PENDIENTE');
  const colaNorte = (await e.como('admin').get('/api/sedes/NORTE/cola')).body;
  const colaCampus = (await e.como('admin').get('/api/sedes/CAMPUS/cola')).body;
  expect(colaNorte.total).toBe(1);
  expect(colaCampus).toEqual({ total: 0, items: [] });
});
```

Ejecución: `npx jest tests/integration/api.int.test.js -t "si el NORTE está saturado"`

```
  ✓ si el NORTE está saturado, la solicitud espera en la cola del NORTE aunque el CAMPUS tenga técnicos libres (476 ms)

Tests: 1 passed, 1 total
```

### Unitaria: redistribución manual — `tests/unit/aplicacion/CasosDeUsoPrototipo.test.js`

```js
test('puede mandar un técnico de OTRA sede a una solicitud escalada (redistribución multisede)', () => {
  const ctx = armar({ tecnicos: [f.nuevoTecnico('T-ANDRES', 'NORTE', 'Bloque A')] });
  const v = pedirFalla(ctx);
  ctx.reloj.avanzarMinutos(10);
  ctx.escalar.ejecutar();

  const r = ctx.asignarManual.ejecutar({ solicitudId: v.id, tecnicoId: 'T-ANDRES' });

  expect(r).toMatchObject({ estado: 'ASIGNADA', tecnicoId: 'T-ANDRES', sede: 'CAMPUS' });
  const [, , destinos] = ctx.espia.publicar.mock.calls.find(([e, d]) => e === 'solicitud:asignada' && d.id === v.id);
  expect(destinos).toEqual(expect.arrayContaining(['tecnico:T-ANDRES', 'sede:CAMPUS', 'sede:NORTE', 'usuario:docente']));
});
```

Ejecución: `npx jest tests/unit/aplicacion/CasosDeUsoPrototipo.test.js -t "puede mandar un técnico de OTRA sede"`

```
  ✓ puede mandar un técnico de OTRA sede a una solicitud escalada (redistribución multisede) (1 ms)

Tests: 1 passed, 1 total
```

### Integración tiempo real — `tests/integration/tiempoReal.int.test.js`

```js
test('un técnico de otra sede NO recibe eventos del CAMPUS (aislamiento multisede)', async () => {
  const andres = await clienteDe('andres');
  const recibidos = [];
  andres.onAny((evento) => recibidos.push(evento));

  await e.pedir('CAM-K-101-VB01');
  await new Promise((ok) => setTimeout(ok, 300));

  expect(recibidos).toEqual([]);
});
```

Ejecución: `npx jest tests/integration/tiempoReal.int.test.js -t "otra sede NO recibe"`

```
  ✓ un técnico de otra sede NO recibe eventos del CAMPUS (aislamiento multisede) (816 ms)

Tests: 1 passed, 1 total
```

## 7. Pantalla del trabajador

**Reto adicional del prototipo.**  
**Qué exige:** El técnico ve su solicitud y solo puede hacer el siguiente paso válido; si no responde o cancela, otro la toma.  
**Atributo de calidad:** Usabilidad · Consistencia  
**Decisión:** Pantalla "5 - Vista del técnico" sobre `AtenderSolicitud` y el **State** del Corte 1; escalación automática con **Chain of Responsibility**.

### Unitaria: State — `tests/unit/dominio/Tecnico.test.js`

```js
test('recorre el ciclo completo y deja la solicitud resuelta', () => {
  // Arrange: técnico disponible, solicitud pendiente
  // Act
  tecnico.asignar(solicitud, 10);
  tecnico.aceptar(solicitud);
  tecnico.confirmarLlegada();
  tecnico.finalizar(solicitud, 99);
  // Assert
  expect(tecnico.nombreEstado).toBe('DISPONIBLE');
  expect(tecnico.solicitudActualId).toBeNull();
  expect(solicitud.estado).toBe(EstadoSolicitud.RESUELTA);
  expect(solicitud.resueltaEn).toBe(99);
});
```

Ejecución: `npx jest tests/unit/dominio/Tecnico.test.js -t "recorre el ciclo completo"`

```
  ✓ recorre el ciclo completo y deja la solicitud resuelta (3 ms)

Tests: 1 passed, 1 total
```

### Unitaria: botón "Cancelar" — `tests/unit/aplicacion/CasosDeUsoPrototipo.test.js`

```js
test('la solicitud pasa a otro técnico de la sede y avisa a ambos', () => {
  const ctx = armar({ tecnicos: [f.nuevoTecnico('T-LAURA', 'CAMPUS', 'Edificio K'), f.nuevoTecnico('T-SOFIA', 'CAMPUS', 'Edificio H')] });
  const v = pedirFalla(ctx);
  ctx.atender.aceptar('T-LAURA');

  const r = ctx.atender.cancelar('T-LAURA');

  expect(r.nuevoTecnico.id).toBe('T-SOFIA');
  expect(ctx.repoSolicitudes.buscarPorId(v.id)).toMatchObject({ estado: 'ASIGNADA', tecnicoId: 'T-SOFIA' });
  expect(ctx.repoTecnicos.buscarPorId('T-LAURA').nombreEstado).toBe('DISPONIBLE');
  const destinos = ctx.espia.publicar.mock.calls.filter(([e]) => e === 'solicitud:devuelta').flatMap(([, , d]) => d);
  expect(destinos).toContain('tecnico:T-LAURA');
});
```

Ejecución: `npx jest tests/unit/aplicacion/CasosDeUsoPrototipo.test.js -t "la solicitud pasa a otro técnico de la sede"`

```
  ✓ la solicitud pasa a otro técnico de la sede y avisa a ambos (1 ms)

Tests: 1 passed, 1 total
```

### Unitaria: escalación por tiempo (límite 4/5 min) — `tests/unit/aplicacion/CasosDeUso.test.js`

```js
test('a los 5 minutos sin aceptar se reasigna a otro técnico (valor límite: 5 min)', () => {
  const ctx = armar({ tecnicos: [f.nuevoTecnico('T-LAURA', 'CAMPUS', 'Edificio K'), f.nuevoTecnico('T-SOFIA', 'CAMPUS', 'Edificio H')] });
  const s = pedirFalla(ctx);
  ctx.reloj.avanzarMinutos(5);

  const r = ctx.escalar.ejecutar();

  expect(r).toEqual([{ id: s.id, accion: 'REASIGNADA' }]);
  expect(ctx.repoSolicitudes.buscarPorId(s.id).tecnicoId).toBe('T-SOFIA');
  expect(ctx.repoTecnicos.buscarPorId('T-LAURA').estaDisponible()).toBe(true);
  expect(eventos(ctx.publicador)).toContainEqual(['solicitud:retirada', ['tecnico:T-LAURA']]);
});
```

Ejecución: `npx jest tests/unit/aplicacion/CasosDeUso.test.js -t "a los 5 minutos sin aceptar"`

```
  ✓ a los 5 minutos sin aceptar se reasigna a otro técnico (valor límite: 5 min) (1 ms)

Tests: 1 passed, 1 total
```

### Integración — `tests/integration/api.int.test.js`

```js
test('si Laura no acepta en 5 minutos se reasigna; el coordinador lo ve', async () => {
  const s = (await e.pedir('CAM-K-101-VB01')).body;
  e.reloj.avanzarMinutos(5);

  const r = await e.como('admin').post('/api/admin/escalar');

  expect(r.body).toEqual([{ id: s.id, accion: 'REASIGNADA' }]);
  const estado = (await e.como('docente').get(`/api/solicitudes/${s.id}`)).body;
  expect(estado.tecnicoId).not.toBe('T-LAURA');
});
```

Ejecución: `npx jest tests/integration/api.int.test.js -t "si Laura no acepta en 5 minutos"`

```
  ✓ si Laura no acepta en 5 minutos se reasigna; el coordinador lo ve (493 ms)

Tests: 1 passed, 1 total
```

## 8. Servicios del prototipo AsisTec (Figma)

**Reto adicional del prototipo.**  
**Qué exige:** Que cada pantalla del prototipo haga algo real: préstamo ahora/agendado, mantenimiento, eventos, falla eléctrica, mis solicitudes y notificaciones.  
**Atributo de calidad:** Modificabilidad · Usabilidad  
**Decisión:** Cada servicio es un creador más en `FabricaSolicitudes` (abierto/cerrado); los casos de uso y la API no cambiaron de forma.

### Unitaria: préstamo — `tests/unit/dominio/ServiciosPrototipo.test.js`

```js
test('"Lo necesito ahora" por salón: queda PENDIENTE, con clase en curso y los datos de la configuración', () => {
  const s = crear({ tipo: 'PRESTAMO_EQUIPO', datos: { recurso: 'PORTATIL', cantidad: 2, requiereInternet: true } });

  expect(s).toMatchObject({ estado: 'PENDIENTE', claseEnCurso: true, codigoEquipo: null, salon: '201', detalle: 'PORTATIL' });
  expect(s.datos).toEqual({ recurso: 'PORTATIL', cantidad: 2, requiereInternet: true, requiereSoftware: false, software: null });
});
```

Ejecución: `npx jest tests/unit/dominio/ServiciosPrototipo.test.js -t ""Lo necesito ahora" por salón"`

```
  ✓ "Lo necesito ahora" por salón: queda PENDIENTE, con clase en curso y los datos de la configuración (2 ms)

Tests: 1 passed, 1 total
```

### Unitaria: agenda, valores límite — `tests/unit/dominio/ServiciosPrototipo.test.js`

```js
test.each([
  ['en el pasado', AHORA - 1],
  ['justo ahora', AHORA],
  [`a más de ${MAX_DIAS_AGENDA} días`, AHORA + (MAX_DIAS_AGENDA * 24 + 1) * HORA],
  ['que no es un número', 'mañana'],
])('una fecha %s se rechaza', (_caso, programadaPara) => {
  expect(() => crear({ tipo: 'PRESTAMO_EQUIPO', datos: { recurso: 'PORTATIL' }, programadaPara })).toThrow(DatoInvalido);
});
```

Ejecución: `npx jest tests/unit/dominio/ServiciosPrototipo.test.js -t "una fecha"`

```
  ✓ una fecha en el pasado se rechaza (1 ms)
  ✓ una fecha justo ahora se rechaza (1 ms)
  ✓ una fecha a más de 90 días se rechaza (0 ms)
  ✓ una fecha que no es un número se rechaza (1 ms)
  ✓ una fecha a exactamente 90 días es válida (borde) (0 ms)

Tests: 5 passed, 5 total
```

### Integración: pantallas 12, 13 y 14 — `tests/integration/prototipo.int.test.js`

```js
test('pantallas 12, 13 y 14: mantenimiento, evento en el auditorio y falla eléctrica', async () => {
  const manana = e.reloj.ahora() + 24 * HORA;
  const pedir = (body) => e.como('docente').post('/api/solicitudes', body);

  const mant = await pedir({ tipo: 'MANTENIMIENTO', ubicacion: { edificio: 'Ad Portas', salon: '101' }, datos: { tipoRevision: 'GENERAL' }, programadaPara: manana });
  const evento = await pedir({
    tipo: 'SOPORTE_EVENTO', ubicacion: { edificio: 'Ad Portas', salon: 'Auditorio' },
    datos: { nombreEvento: 'Semana de la Ingeniería', requerimientos: ['VIDEO_BEAM_EXTRA'] }, programadaPara: manana,
  });
  const electrica = await pedir({ tipo: 'FALLA_ELECTRICA', ubicacion: { edificio: 'Edificio K', salon: '204' }, datos: { tipoFalla: 'SIN_ENERGIA' } });

  expect([mant.status, mant.body.estado]).toEqual([201, 'PROGRAMADA']);
  expect([evento.status, evento.body.titulo]).toEqual([201, 'Semana de la Ingeniería']);
  expect(electrica.status).toBe(404); // el Edificio K no tiene salón 204 en los datos de ejemplo
});
```

Ejecución: `npx jest tests/integration/prototipo.int.test.js -t "pantallas 12, 13 y 14"`

```
  ✓ pantallas 12, 13 y 14: mantenimiento, evento en el auditorio y falla eléctrica (426 ms)

Tests: 1 passed, 1 total
```

### Integración: pantallas 8 y 11 — `tests/integration/prototipo.int.test.js`

```js
test('pantalla 8 "Mis solicitudes" y pantalla 11 "Notificaciones"', async () => {
  const falla = (await e.pedir('CAM-O-301-VB01')).body;
  await e.como('laura').post('/api/tecnicos/yo/aceptar');

  const mias = (await e.como('docente').get('/api/solicitudes/mias')).body;
  expect(mias.activas).toEqual([expect.objectContaining({ id: falla.id, tecnico: expect.objectContaining({ nombre: 'Laura Martínez', estado: 'EN_CAMINO' }) })]);
  expect((await e.como('docente.norte').get('/api/solicitudes/mias')).body).toEqual({ activas: [], historial: [] });

  const notif = (await e.como('docente').get('/api/notificaciones')).body;
  expect(notif.items[0]).toMatchObject({ titulo: 'Técnico asignado', mensaje: 'Laura va en camino a Salón 301', leida: false });
  await e.como('docente').post('/api/notificaciones/leidas');
  expect((await e.como('docente').get('/api/notificaciones')).body.noLeidas).toBe(0);
});
```

Ejecución: `npx jest tests/integration/prototipo.int.test.js -t "pantalla 8 "Mis solicitudes""`

```
  ✓ pantalla 8 "Mis solicitudes" y pantalla 11 "Notificaciones" (575 ms)

Tests: 1 passed, 1 total
```
