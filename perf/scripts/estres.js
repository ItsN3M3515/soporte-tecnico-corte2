/**
 * PRUEBA 3 — ESTRÉS (buscar el punto de quiebre).
 * No representa un día real: sube la tasa de solicitudes nuevas hasta 300/s durante
 * 2 minutos para encontrar QUÉ se rompe primero y a partir de qué volumen.
 * Las pantallas consultan la cola 50 veces por segundo todo el tiempo.
 * Mismo SLO que las otras pruebas; aquí se espera incumplirlo.
 */
import { sleep } from 'k6';
import { prepararDatos, crearSolicitud, consultarCola, consultarDemanda, cicloTecnico } from './comun.js';

export const options = {
  scenarios: {
    docentes: {
      executor: 'ramping-arrival-rate', startRate: 10, timeUnit: '1s', preAllocatedVUs: 100, maxVUs: 400, exec: 'docentes',
      stages: [{ target: 100, duration: '30s' }, { target: 300, duration: '60s' }, { target: 300, duration: '30s' }],
    },
    pantallas: { executor: 'constant-arrival-rate', rate: 50, timeUnit: '1s', duration: '2m', preAllocatedVUs: 50, maxVUs: 300, exec: 'pantallas' },
    tecnicos: { executor: 'constant-vus', vus: 4, duration: '2m', exec: 'tecnicos' },
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
