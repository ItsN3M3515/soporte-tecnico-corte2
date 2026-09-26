const { Tecnico } = require('../domain/tecnicos/Tecnico');
const { CredencialesJWT } = require('../adapters/out/seguridad/CredencialesJWT');

/**
 * Datos de demostración (simulados). Dos sedes para el reto multisede.
 * Los edificios y técnicos del CAMPUS vienen del Main.java del Corte 1.
 * El Edificio O no tiene carrito ni técnico propio: es el caso de "cobertura desigual".
 */
const SEDES = {
  CAMPUS: ['Edificio K', 'Edificio H', 'Edificio O', 'Ad Portas'],
  NORTE: ['Bloque A', 'Bloque B'],
};

const MAPA_CERCANIA = {
  'Edificio O': ['Edificio K', 'Ad Portas'],
  'Edificio K': ['Edificio O', 'Edificio H'],
  'Edificio H': ['Edificio K'],
  'Ad Portas': ['Edificio O'],
  'Bloque B': ['Bloque A'],
  'Bloque A': ['Bloque B'],
};

// Teléfonos ficticios (formato colombiano de demostración) para el botón de llamar del seguimiento.
const TECNICOS = [
  { id: 'T-LAURA', nombre: 'Laura Martínez', usuario: 'laura', telefono: '+57 300 000 0001', sede: 'CAMPUS', edificioBase: 'Edificio K' },
  { id: 'T-MIGUEL', nombre: 'Miguel Rodríguez', usuario: 'miguel', telefono: '+57 300 000 0002', sede: 'CAMPUS', edificioBase: 'Ad Portas' },
  { id: 'T-SOFIA', nombre: 'Sofía Gómez', usuario: 'sofia', telefono: '+57 300 000 0003', sede: 'CAMPUS', edificioBase: 'Edificio H' },
  { id: 'T-ANDRES', nombre: 'Andrés Pardo', usuario: 'andres', telefono: '+57 300 000 0004', sede: 'NORTE', edificioBase: 'Bloque A' },
];

const abreviar = (edificio) => edificio.replace('Edificio ', '').replace('Bloque ', 'B').replace('Ad Portas', 'AP');
// Salones por edificio: piso + número (101 = piso 1, salón 01). El código del QR sigue siendo
// <SEDE>-<EDIFICIO>-<SALÓN>-<EQUIPO>, p. ej. CAM-O-301-VB01 = video beam del salón 301 del Edificio O.
const SALONES = ['101', '102', '201', '202', '301'];
const TIPOS_EQUIPO = [
  { sufijo: 'VB01', descripcion: 'Video Beam' },
  { sufijo: 'PC01', descripcion: 'PC de salón' },
];
// El auditorio de Ad Portas solo existe para eventos (tiene video beam, no PC de salón).
const AUDITORIO = { codigo: 'CAM-AP-AUD-VB01', descripcion: 'Video Beam', salon: 'Auditorio', edificio: 'Ad Portas', sede: 'CAMPUS' };

function generarEquipos() {
  const equipos = [];
  Object.entries(SEDES).forEach(([sede, edificios]) => {
    edificios.forEach((edificio) => {
      SALONES.forEach((salon) => {
        TIPOS_EQUIPO.forEach(({ sufijo, descripcion }) => {
          equipos.push({ codigo: `${sede.slice(0, 3)}-${abreviar(edificio)}-${salon}-${sufijo}`, descripcion, salon, edificio, sede });
        });
      });
    });
  });
  equipos.push(AUDITORIO);
  return equipos;
}

// La docente de ejemplo es la del prototipo de Figma (pantallas "Inicio" y "Mi perfil").
const USUARIOS = [
  { usuario: 'admin', nombre: 'Coordinación de soporte', rol: 'ADMIN', correo: 'soporte@unisabana.edu.co', clave: 'admin123' },
  { usuario: 'docente', nombre: 'Amy Jeanine', rol: 'DOCENTE', sede: 'CAMPUS', correo: 'amy.jeanine@unisabana.edu.co', clave: 'docente123' },
  { usuario: 'estudiante', nombre: 'Valentina Rojas', rol: 'ESTUDIANTE', sede: 'CAMPUS', correo: 'valentina.rojas@unisabana.edu.co', clave: 'estudiante123' },
  { usuario: 'docente.norte', nombre: 'Prof. Demo Norte', rol: 'DOCENTE', sede: 'NORTE', correo: 'docente.norte@unisabana.edu.co', clave: 'docente123' },
  ...TECNICOS.map((t) => ({
    usuario: t.usuario,
    nombre: t.nombre,
    rol: 'TECNICO',
    sede: t.sede,
    tecnicoId: t.id,
    correo: `${t.usuario}.soporte@unisabana.edu.co`,
    clave: 'tecnico123',
  })),
];

/** Carga los datos si la BD está vacía. Idempotente. */
function sembrar(contenedor) {
  const { db, repoTecnicos, repoEquipos, repoUsuarios } = contenedor;
  const yaTiene = db.prepare('SELECT COUNT(*) AS n FROM tecnicos').get().n > 0;
  if (yaTiene) return false;
  contenedor.unidadDeTrabajo.ejecutar(() => {
    TECNICOS.forEach(({ usuario: _u, ...t }) => repoTecnicos.guardar(new Tecnico(t)));
    generarEquipos().forEach((e) => repoEquipos.guardar(e));
    USUARIOS.forEach(({ clave, ...u }) => repoUsuarios.guardar({ ...u, hashClave: CredencialesJWT.hashear(clave) }));
  });
  return true;
}

module.exports = { SEDES, SALONES, MAPA_CERCANIA, TECNICOS, USUARIOS, generarEquipos, sembrar };
