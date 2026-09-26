const fs = require('node:fs');
const path = require('node:path');
const { PNG } = require('pngjs');
const jsQR = require('jsqr');
const QRCode = require('qrcode');
const { crearEntorno } = require('./entorno');
const { imagenQR } = require('../../src/config/imagenQR');
const { generarEquipos } = require('../../src/config/datosIniciales');

/**
 * PRUEBA DEL RETO "Reservar mediante QR" / "QR asociado al PC" CON IMÁGENES REALES.
 *
 * Aquí no se escribe el texto del QR a mano: se genera la IMAGEN PNG que se imprime,
 * se LEE con un decodificador de QR (jsQR, el mismo tipo de lectura que hace la
 * cámara) y lo que sale de la lectura se envía a la API, igual que la app.
 *
 *   imagen PNG  →  escanear (jsQR)  →  texto  →  POST /api/solicitudes  →  técnico asignado
 */
const CARPETA_QR = path.join(__dirname, '..', '..', '..', 'docs', 'qr');
/** La imagen que realmente se imprimió con `npm run qr`. */
const impreso = (codigo) => fs.readFileSync(path.join(CARPETA_QR, `${codigo}.png`));

function escanear(png) {
  const { width, height, data } = PNG.sync.read(png);
  const lectura = jsQR(new Uint8ClampedArray(data), width, height);
  return lectura ? lectura.data : null;
}

/** Simula un sticker rayado: pinta de blanco un cuadrado en el centro que cubre `fraccion` del área. */
function rayarCentro(png, fraccion) {
  const img = PNG.sync.read(png);
  const lado = Math.floor(img.width * Math.sqrt(fraccion));
  const desde = Math.floor((img.width - lado) / 2);
  for (let y = desde; y < desde + lado; y += 1) {
    const inicio = (y * img.width + desde) * 4;
    img.data.fill(255, inicio, inicio + lado * 4);
  }
  return PNG.sync.write(img);
}

describe('Escaneo de QR con imágenes reales', () => {
  let e;

  beforeEach(() => {
    e = crearEntorno();
  });

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

  describe('después de escanear: decir QUÉ le pasa al equipo', () => {
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

    test.each([
      ['un problema que no es de ese equipo (control remoto de un PC)', { problema: 'CONTROL' }],
      ['"Otro problema" sin describirlo', { problema: 'OTRO' }],
      ['un problema inventado', { problema: 'EXPLOTO' }],
    ])('se rechaza %s (400) y no se crea nada', async (_caso, datos) => {
      const res = await e.como('docente').post('/api/solicitudes', { qr: escanear(impreso('CAM-O-301-PC01')), tipo: 'FALLA_EQUIPO_FIJO', datos });
      expect(res.status).toBe(400);
      expect((await e.como('docente').get('/api/solicitudes/mias')).body.activas).toEqual([]);
    });

    test('"Otro problema" con descripción: el técnico lee lo que escribió la persona', async () => {
      const res = await e.como('estudiante').post('/api/solicitudes', {
        qr: escanear(impreso('CAM-O-301-PC01')),
        tipo: 'FALLA_EQUIPO_FIJO',
        datos: { problema: 'OTRO', descripcion: 'Huele a quemado' },
      });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ detalle: 'Huele a quemado', datos: { problema: 'OTRO', descripcion: 'Huele a quemado' } });
    });
  });

  test('reservar un portátil escaneando el QR del PC del salón 102 (Edificio H)', async () => {
    const leido = escanear(impreso('CAM-H-102-PC01'));

    const res = await e.como('docente').post('/api/solicitudes', { qr: leido, tipo: 'PRESTAMO_EQUIPO', detalle: 'PORTATIL' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ tipo: 'PRESTAMO_EQUIPO', detalle: 'PORTATIL', salon: '102', tecnicoNombre: 'Sofía Gómez' });
  });

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

  test('un QR pequeño (120 px, como visto de lejos) también se lee', async () => {
    const leido = escanear(await imagenQR('NOR-BA-101-VB01', { width: 120, margin: 1 }));
    expect(leido).toBe('SOPORTE:v1:NOR-BA-101-VB01');
  });

  test('un QR que no es del sistema (por ejemplo, un enlace web) se lee pero la API lo rechaza con 400', async () => {
    const leido = escanear(await QRCode.toBuffer('https://www.unisabana.edu.co', { width: 300 }));

    const res = await e.como('docente').post('/api/solicitudes', { qr: leido, tipo: 'FALLA_EQUIPO_FIJO' });

    expect(leido).toBe('https://www.unisabana.edu.co');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no pertenece al sistema/);
  });

  test('un QR con formato correcto pero de un equipo que no existe → 404 y no se crea nada', async () => {
    const leido = escanear(await imagenQR('CAM-Z-999-XX01'));

    const res = await e.como('docente').post('/api/solicitudes', { qr: leido, tipo: 'FALLA_EQUIPO_FIJO' });
    const demanda = (await e.como('admin').get('/api/admin/demanda')).body;

    expect(res.status).toBe(404);
    expect(demanda.every((d) => d.enCola === 0 && d.enAtencion === 0)).toBe(true);
  });

  test('un QR copiado de otro salón NO puede cambiar la ubicación: manda la BD, no el QR', async () => {
    // Alguien intenta escribir su propia ubicación en el QR
    const falso = escanear(await QRCode.toBuffer('SOPORTE:v1:CAM-K-101-VB01:salon=O-105', { width: 300 }));

    const res = await e.como('docente').post('/api/solicitudes', { qr: falso, tipo: 'FALLA_EQUIPO_FIJO' });

    expect(res.status).toBe(400);
  });

  describe('stickers rayados (por qué se imprime con corrección de errores H)', () => {
    test('con el 10 % del centro rayado, el QR impreso (nivel H) se sigue leyendo', async () => {
      const leido = escanear(rayarCentro(impreso('CAM-O-101-VB01'), 0.1));
      expect(leido).toBe('SOPORTE:v1:CAM-O-101-VB01');
    });

    test('con el mismo rayón, un QR de nivel M ya no se lee (por eso se descartó M)', async () => {
      const leido = escanear(rayarCentro(await imagenQR('CAM-O-101-VB01', { errorCorrectionLevel: 'M' }), 0.1));
      expect(leido).toBeNull();
    });

    test('medido sobre los 61 QR impresos: con el 10 % rayado se leen al menos el 95 %', () => {
      // Resultado medido al regenerar los QR del Corte 2: se leen 59 de 61. Los que no se leen con ese
      // rayón son CAM-O-201-VB01 y CAM-O-301-VB01. Para esos casos está la búsqueda manual de la app.
      const archivos = fs.readdirSync(CARPETA_QR).filter((f) => f.endsWith('.png'));
      const leidos = archivos.filter((f) => escanear(rayarCentro(fs.readFileSync(path.join(CARPETA_QR, f)), 0.1)) !== null);
      expect(leidos.length / archivos.length).toBeGreaterThanOrEqual(0.95);
    }, 30000);

    test('con el 30 % rayado no se lee nada, y la app no llega a enviar solicitud', async () => {
      const leido = escanear(rayarCentro(impreso('CAM-O-101-VB01'), 0.3));
      expect(leido).toBeNull();
    });
  });
});
