# ADR-005 — Notificaciones del docente como Decorator del puerto de eventos

- **Estado:** Aceptada
- **Fecha:** 2026-09-23

## Contexto

El prototipo de Figma tiene una pantalla "11 - Notificaciones" (técnico asignado, cambio de estado, solicitud resuelta) y una campana en el Inicio. Hasta ahora el docente solo veía los cambios si tenía abierta la pantalla de seguimiento: los eventos de Socket.IO iban a las salas `admin`, `sede:X` y `tecnico:Y`, y nadie guardaba nada.

Necesitábamos dos cosas: que los eventos de una solicitud también le lleguen a **quien la creó**, y que queden **guardados** para verlos después. Cinco casos de uso publican eventos (`CrearSolicitud`, `AtenderSolicitud`, `EscalarVencidas`, `AsignarManualmente`, `ActivarProgramadas`).

## Opciones

| Opción | A favor | En contra |
|---|---|---|
| A. Que cada caso de uso cree la notificación | Todo explícito y dentro de la transacción | Cinco casos de uso cambian; la regla "a quién avisar y con qué texto" queda repartida |
| B. **Decorator sobre el puerto `PublicadorEventos`** | Ningún caso de uso cambia; la regla vive en un solo archivo; se prueba con un espía detrás | La notificación se guarda después del commit, fuera de la transacción |
| C. Broker de eventos (RabbitMQ) con un consumidor de notificaciones | Desacople total | Infraestructura nueva para 4 técnicos y 2 sedes (lo descartamos en el ADR-001) |

## Decisión

Opción **B**. `src/application/NotificacionesDocente.js` implementa el mismo contrato `publicar(evento, datos, destinos)`. Envuelve al publicador real y, si el evento es de una solicitud:

1. agrega la sala `usuario:<creadaPor>` a los destinos (la pantalla de seguimiento y el Inicio se actualizan solos);
2. arma un texto ("Laura va en camino a Salón 301") y lo guarda con el nuevo puerto `RepositorioNotificaciones`;
3. empuja `notificacion:nueva` a esa misma sala.

La raíz de composición (`config/contenedor.js`) le entrega a los casos de uso el publicador decorado. El adaptador de Socket.IO mete a cada usuario en su sala `usuario:<usuario>` al conectarse.

## Consecuencias

- **Modificabilidad:** agregar un aviso nuevo es agregar una plantilla al `Map` de `NotificacionesDocente`.
- **Testabilidad:** `CasosDeUsoPrototipo.test.js` pone un espía detrás del decorador y verifica eventos y avisos a la vez; `prototipo.int.test.js` lo comprueba con sockets reales.
- **Lo que se sacrifica:** la notificación no está en la transacción. Si guardarla falla, la solicitud ya quedó guardada y el error solo va al log (hay una prueba que lo fuerza: "si guardar el aviso falla, la operación principal NO se cae"). Preferimos perder un aviso a perder una solicitud.
- **Carga:** cada evento de una solicitud hace ahora un `INSERT` más. Se volvieron a correr las pruebas de carga con esta versión (ver [pruebas.md §4](../pruebas.md#4-pruebas-de-carga)).
