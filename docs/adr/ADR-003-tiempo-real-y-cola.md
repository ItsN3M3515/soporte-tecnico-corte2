# ADR-003 — Tiempo real con Socket.IO y cola de prioridades con envejecimiento

- **Estado:** Aceptada
- **Fecha:** 2026-09-22

## Contexto

Reto "Reporte en tiempo real, cola de prioridades". Hoy el docente llama por teléfono y no sabe si alguien viene. El técnico no ve qué está pendiente en otros edificios. Necesitamos dos cosas:

1. que el técnico, el docente y el coordinador vean los cambios **sin recargar**;
2. que, cuando no hay técnicos libres, se atienda primero lo más urgente **sin que lo menos urgente espere para siempre**.

## Opciones consideradas

**Canal de tiempo real**

| Opción | A favor | En contra |
|---|---|---|
| Polling cada N segundos | Trivial | Latencia de hasta N s y carga inútil. La prueba de estrés mostró que las consultas de cola son lo que más pesa |
| **Socket.IO (WebSocket)** | Empuja al instante, tiene salas por rol y sede, funciona en Expo y en web | Conexiones abiertas en el servidor. Si la app está cerrada, no llega nada |
| Push notifications (Expo Notifications) | Llega con la app cerrada | Necesita cuentas de Expo/FCM/APNs y una build propia (no sirve en Expo Go) |

**Orden de la cola**

| Opción | En contra |
|---|---|
| FIFO | Un préstamo de extensión sin clase bloquearía una falla de video beam con 40 estudiantes esperando |
| Prioridad fija | Inanición: lo de baja prioridad podría no atenderse nunca en un día cargado |
| **Prioridad por impacto + envejecimiento (aging)** | Hay que calibrar los pesos |

## Decisión

- **Socket.IO** detrás del puerto `PublicadorEventos` (`src/adapters/out/realtime/PublicadorSocketIO.js`). El servidor mete a cada usuario en salas según su token: `admin`, `sede:<sede>`, `tecnico:<id>`. Los casos de uso publican **después** de confirmar la transacción, así nunca se anuncia algo que no quedó guardado.
- **Cola de prioridades** como montículo binario (`src/domain/prioridad/ColaPrioridad.js`) con la política intercambiable **Strategy** `PoliticaImpactoYEspera` (`src/domain/prioridad/politicas.js`):
  - impacto base: falla con clase 100 · préstamo con clase 60 · falla sin clase 50 · préstamo sin clase 30
  - +2 puntos por minuto de espera, con tope de 60 minutos (+120)
  - empate → la más antigua primero
- Cuando un técnico finaliza, recibe automáticamente la más prioritaria de **su sede** (`GestorAsignaciones.siguienteParaTecnico`).

## Consecuencias

- **+** Probado: el técnico recibe `solicitud:asignada` en vivo; un técnico de otra sede no recibe nada; un socket sin token es rechazado (`tests/integration/tiempoReal.int.test.js`).
- **+** Probado: un préstamo sin clase que lleva 40 min supera a una falla urgente recién llegada, así que no hay inanición (`tests/unit/dominio/Prioridad.test.js`).
- **+** La política se puede cambiar (por ejemplo, a FIFO) sin tocar la cola (probado con `PoliticaOrdenDeLlegada`).
- **−** Con la app cerrada no llega nada. Queda para el Corte 3 un adaptador de push detrás del mismo puerto.
- **−** Los pesos (100/60/50/30, 2 pts/min) son una propuesta del equipo y no están validados con el área de soporte.
