# ADR-006 — Solicitudes agendadas: estado PROGRAMADA que entra sola a la cola

- **Estado:** Aceptada
- **Fecha:** 2026-09-23

## Contexto

En el prototipo el préstamo tiene "Lo necesito ahora" y "Agendar para después" (con calendario), y el mantenimiento y el soporte para eventos siempre llevan fecha. Una solicitud para el viernes a las 2:00 p. m. no debe ocupar a un técnico hoy, ni competir en la cola con las fallas de este momento. Pero tampoco se puede olvidar.

## Opciones

| Opción | En contra |
|---|---|
| A. Guardarla PENDIENTE con prioridad baja | Un técnico libre la tomaría hoy; y el envejecimiento (aging) la subiría durante días |
| B. Un calendario aparte, fuera del sistema de solicitudes | Otra fuente de verdad; el coordinador no la vería en su panel |
| C. **Nuevo estado `PROGRAMADA` + caso de uso `ActivarProgramadas`** | Un estado más en la entidad y un disparo periódico |

## Decisión

Opción **C**.

- `FabricaSolicitudes` decide por tipo si la agenda está prohibida (fallas), es opcional (préstamo) u obligatoria (mantenimiento, evento), y valida la fecha: no en el pasado y máximo 90 días adelante.
- Con fecha, la solicitud nace `PROGRAMADA` y no se asigna.
- `ActivarProgramadas` corre en el mismo ciclo del `ProgramadorEscalacion` (cada 30 s). Cuando faltan 30 minutos o menos para la hora pedida, la pasa a `PENDIENTE` y trata de asignarla como cualquier otra.
- La espera (y por tanto el aging y la escalación a los 10 minutos) cuenta desde que se **activa**, no desde que se pidió (`Solicitud.inicioEspera()`).

## Consecuencias

- La cola de prioridades sigue siendo una sola; lo agendado entra a ella en el momento correcto.
- Valores límite probados con el reloj falso: a los 29 minutos antes no se activa, a los 30 sí (`CasosDeUsoPrototipo.test.js`).
- **Límite:** la precisión es la del ciclo del programador (30 s por defecto) y la hora se elige en bloques fijos (7:00, 10:00, 12:00, 2:00, 4:00 y 6:00). Si el servidor está apagado a la hora de activación, la solicitud se activa en el primer ciclo después de encender, ya tarde.
