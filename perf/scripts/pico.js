/**
 * PRUEBA 2 — PICO (inicio de clases, 7:00 a.m.).
 * Reto: "Reporte en tiempo real, cola de prioridades" + "Multisede (distribución y demanda)".
 * Hipótesis: al empezar la jornada muchos salones reportan a la vez que el video beam
 * no prende. Se pasa de 2 a 30 solicitudes/s en 15 s, se mantiene 1 minuto y baja.
 * Eso son ~1.900 solicitudes en 90 s: mucho más que lo real (el campus tiene del orden
 * de cientos de salones), a propósito, para ver dónde se rompe.
 * En paralelo, las pantallas de técnicos/admin refrescan la cola 20 veces por segundo.
 *
 * SLO (el mismo del baseline, fijado antes de ejecutar):
 *   crear_solicitud p95 ≤ 500 ms | consultar_cola p95 ≤ 300 ms | errores < 1 %
 */
import { sleep } from 'k6';
import { prepararDatos, crearSolicitud, consultarCola, consultarDemanda, cicloTecnico } from './comun.js';

export const options = {
  scenarios: {
    docentes: {
      executor: 'ramping-arrival-rate', startRate: 2, timeUnit: '1s', preAllocatedVUs: 50, maxVUs: 200, exec: 'docentes',
      stages: [{ target: 30, duration: '15s' }, { target: 30, duration: '60s' }, { target: 2, duration: '15s' }],
    },
    pantallas: { executor: 'constant-arrival-rate', rate: 20, timeUnit: '1s', duration: '90s', preAllocatedVUs: 30, maxVUs: 100, exec: 'pantallas' },
    tecnicos: { executor: 'constant-vus', vus: 4, duration: '90s', exec: 'tecnicos' },
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
