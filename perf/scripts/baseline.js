/**
 * PRUEBA 1 — BASELINE (carga normal de una mañana).
 * Reto: "Reporte en tiempo real, cola de prioridades" + "Multisede".
 * Carga: 2 solicitudes nuevas por segundo durante 1 minuto (≈120 solicitudes),
 * 5 consultas de cola por segundo (pantallas de técnicos/admin refrescando) y los
 * 4 técnicos atendiendo.
 *
 * SLO definido ANTES de ejecutar (ver perf/README.md):
 *   crear_solicitud  p95 ≤ 500 ms
 *   consultar_cola   p95 ≤ 300 ms
 *   errores          < 1 %
 */
import { sleep } from 'k6';
import { prepararDatos, crearSolicitud, consultarCola, consultarDemanda, cicloTecnico } from './comun.js';

export const options = {
  scenarios: {
    docentes: { executor: 'constant-arrival-rate', rate: 2, timeUnit: '1s', duration: '1m', preAllocatedVUs: 10, exec: 'docentes' },
    pantallas: { executor: 'constant-arrival-rate', rate: 5, timeUnit: '1s', duration: '1m', preAllocatedVUs: 10, exec: 'pantallas' },
    tecnicos: { executor: 'constant-vus', vus: 4, duration: '1m', exec: 'tecnicos' },
  },
  thresholds: {
    'http_req_duration{nombre:crear_solicitud}': ['p(95)<500'],
    'http_req_duration{nombre:consultar_cola}': ['p(95)<300'],
    http_req_failed: ['rate<0.01'],
  },
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

export const setup = prepararDatos;
export function docentes(datos) { crearSolicitud(datos); }
export function pantallas(datos) { if (Math.random() < 0.8) consultarCola(datos); else consultarDemanda(datos); }
export function tecnicos(datos) { cicloTecnico(datos, __VU); sleep(2); }
