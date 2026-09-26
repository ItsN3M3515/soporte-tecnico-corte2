// Utilidades compartidas por los escenarios de carga (k6).
import http from 'k6/http';
import { check } from 'k6';

export const BASE = __ENV.API_URL || 'http://localhost:3000/api';
const JSON_H = { 'Content-Type': 'application/json' };

export function login(usuario, clave) {
  const r = http.post(`${BASE}/auth/login`, JSON.stringify({ usuario, clave }), { headers: JSON_H, tags: { nombre: 'login' } });
  check(r, { 'login 200': (x) => x.status === 200 });
  return r.json('token');
}

/** Se ejecuta una sola vez antes de la prueba: tokens y catálogo de equipos. */
export function prepararDatos() {
  const tokens = {
    docente: login('docente', 'docente123'),
    docenteNorte: login('docente.norte', 'docente123'),
    admin: login('admin', 'admin123'),
    tecnicos: ['laura', 'miguel', 'sofia', 'andres'].map((u) => login(u, 'tecnico123')),
  };
  const equipos = http.get(`${BASE}/admin/equipos`, { headers: { Authorization: `Bearer ${tokens.admin}` } }).json();
  return { tokens, equipos };
}

const auth = (token) => ({ Authorization: `Bearer ${token}`, ...JSON_H });

/** Un docente escanea el QR de un equipo al azar y pide soporte (70 % fallas, 30 % préstamos). */
export function crearSolicitud(datos) {
  const equipo = datos.equipos[Math.floor(Math.random() * datos.equipos.length)];
  const token = equipo.sede === 'NORTE' ? datos.tokens.docenteNorte : datos.tokens.docente;
  const esFalla = Math.random() < 0.7;
  const cuerpo = {
    qr: `SOPORTE:v1:${equipo.codigo}`,
    tipo: esFalla ? 'FALLA_EQUIPO_FIJO' : 'PRESTAMO_EQUIPO',
    detalle: esFalla ? null : 'PORTATIL',
    claseEnCurso: Math.random() < 0.6,
  };
  const r = http.post(`${BASE}/solicitudes`, JSON.stringify(cuerpo), { headers: auth(token), tags: { nombre: 'crear_solicitud' } });
  check(r, { 'crear 201': (x) => x.status === 201 });
  return r;
}

/** La pantalla del trabajador / admin refresca la cola de una sede. */
export function consultarCola(datos, sede = 'CAMPUS') {
  const r = http.get(`${BASE}/sedes/${sede}/cola`, { headers: auth(datos.tokens.admin), tags: { nombre: 'consultar_cola' } });
  check(r, { 'cola 200': (x) => x.status === 200 });
  return r;
}

export function consultarDemanda(datos) {
  const r = http.get(`${BASE}/admin/demanda`, { headers: auth(datos.tokens.admin), tags: { nombre: 'panel_admin' } });
  check(r, { 'demanda 200': (x) => x.status === 200 });
  return r;
}

/** Un técnico avanza su ciclo: acepta, llega y finaliza (si no tiene nada, el API responde 409 y es esperado). */
export function cicloTecnico(datos, indice) {
  const h = { headers: auth(datos.tokens.tecnicos[indice % datos.tokens.tecnicos.length]), tags: { nombre: 'accion_tecnico' }, responseCallback: http.expectedStatuses(200, 409) };
  ['aceptar', 'llegada', 'finalizar'].forEach((accion) => http.post(`${BASE}/tecnicos/yo/${accion}`, null, h));
}
